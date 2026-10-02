import { Elysia, t } from "elysia";
import { eq, and, or, desc, asc, count, gt, inArray, ilike, isNull, ne, notInArray } from "drizzle-orm";
import {
  users,
  follows,
  posts,
  postLikes,
  postComments,
  workouts,
  routines,
  routineExercises,
  exercises,
  bodyMetrics,
  stories,
  storyViews,
  storyLikes,
  notifications,
  pushTokens,
  type Database,
  type User,
  type Post,
  type WorkoutSnapshot,
  type RoutineSnapshot,
  type BodyMetricSnapshot,
  type PostSnapshot,
} from "@gymapp/db";
import {
  estimate1RM,
  CreatePostInput,
  CreateCommentInput,
  CreateStoryInput,
  UserSearchQuery,
  PushTokenInput,
} from "@gymapp/shared";
import { authService } from "../plugins/auth";
import { errorBody } from "../lib/errors";
import { sendPush } from "../lib/push";
import { userProfileStats } from "./stats";

// Perfil publico minimo — nunca expoe email.
function publicUserLite(u: User) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    avatarUrl: u.avatarUrl ?? null,
    bio: u.bio ?? null,
    isPrivate: u.isPrivate,
  };
}

// Quem pode ver o conteudo de `target`: o proprio, todo mundo se publico,
// ou so seguidores aceitos se privado.
async function canView(db: Database, viewerId: string, target: User): Promise<boolean> {
  if (viewerId === target.id) return true;
  if (!target.isPrivate) return true;
  const rel = await db.query.follows.findFirst({
    where: and(
      eq(follows.followerId, viewerId),
      eq(follows.followingId, target.id),
      eq(follows.status, "accepted"),
    ),
  });
  return !!rel;
}

// Estado da relacao do viewer com o autor (pra UI: Seguir/Solicitado/Seguindo).
async function followState(db: Database, viewerId: string, authorId: string) {
  if (viewerId === authorId) return { isFollowing: false, isPending: false };
  const rel = await db.query.follows.findFirst({
    where: and(eq(follows.followerId, viewerId), eq(follows.followingId, authorId)),
  });
  return {
    isFollowing: rel?.status === "accepted",
    isPending: rel?.status === "pending",
  };
}

// Notificacao in-app (aba Atividade) + push fire-and-forget. Acoes do
// proprio usuario nunca geram notificacao.
async function notify(
  db: Database,
  targetUserId: string,
  actor: User,
  type: NotificationType,
  refs: { postId?: string; storyId?: string } = {},
) {
  if (targetUserId === actor.id) return;
  await db.insert(notifications).values({
    userId: targetUserId,
    actorId: actor.id,
    type,
    postId: refs.postId ?? null,
    storyId: refs.storyId ?? null,
  });
  const copy = PUSH_COPY[type];
  void sendPush(db, targetUserId, {
    title: copy.title,
    body: `${actor.name} ${copy.body}`,
    data: {
      type,
      ...(refs.postId ? { postId: refs.postId } : {}),
      ...(refs.storyId ? { storyId: refs.storyId } : {}),
    },
  });
}

// Ranking do feed MVP: engajamento amortecido pela idade do post.
// curtida pesa 2, comentario pesa 3; a idade em horas decai com expoente 1.2.
function rankScore(p: { likesCount: number; commentsCount: number; createdAt: string }): number {
  const hours = Math.max(0, (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000);
  const engagement = p.likesCount * 2 + p.commentsCount * 3;
  return engagement / Math.pow(hours + 2, 1.2);
}

// Quantos posts recentes entram no ranking (janela do algoritmo).
const FEED_CANDIDATES = 300;

type NotificationType =
  | "follow"
  | "follow_request"
  | "follow_accepted"
  | "like"
  | "comment"
  | "story_like";

// Texto do push por tipo — o corpo e prefixado pelo nome do actor no notify().
const PUSH_COPY: Record<NotificationType, { title: string; body: string }> = {
  follow: { title: "Novo seguidor", body: "comecou a te seguir" },
  follow_request: { title: "Pedido de seguidor", body: "pediu pra te seguir" },
  follow_accepted: { title: "Pedido aceito", body: "aceitou seu pedido pra seguir" },
  like: { title: "Curtida", body: "curtiu seu post" },
  comment: { title: "Novo comentario", body: "comentou no seu post" },
  story_like: { title: "Story curtido", body: "curtiu seu story" },
};

// Query de paginacao declarada com o `t` do Elysia (o PaginationQuery do shared
// usa @sinclair/typebox puro e nao coage string->number em query params).
const PageQuery = t.Object({
  page: t.Optional(t.Integer({ minimum: 1 })),
  pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
});

export function socialRoutes(db: Database) {
  // Enriquecimento de posts: autor, contadores e flags do viewer. Recebe os
  // posts crus e devolve o formato que o app consome.
  async function enrichPosts(rows: Post[], viewerId: string) {
    if (rows.length === 0) return [];
    const postIds = rows.map((p) => p.id);
    const authorIds = [...new Set(rows.map((p) => p.userId))];

    const [authors, likes, myLikes, commentCounts] = await Promise.all([
      db.query.users.findMany({ where: inArray(users.id, authorIds) }),
      db
        .select({ postId: postLikes.postId, userId: postLikes.userId })
        .from(postLikes)
        .where(inArray(postLikes.postId, postIds)),
      db
        .select({ postId: postLikes.postId })
        .from(postLikes)
        .where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, viewerId))),
      db
        .select({ postId: postComments.postId, value: count() })
        .from(postComments)
        .where(inArray(postComments.postId, postIds))
        .groupBy(postComments.postId),
    ]);

    const authorMap = new Map(authors.map((a) => [a.id, a]));
    const likeCount = new Map<string, number>();
    for (const l of likes) likeCount.set(l.postId, (likeCount.get(l.postId) ?? 0) + 1);
    const myLikeSet = new Set(myLikes.map((l) => l.postId));
    const commentCount = new Map(commentCounts.map((c) => [c.postId, c.value]));

    // Posts cujo autor sumiu (conta apagada sem cascade cobrir) nao renderizam.
    return rows
      .filter((p) => authorMap.has(p.userId))
      .map((p) => {
        const author = authorMap.get(p.userId)!;
        return {
          id: p.id,
          createdAt: p.createdAt.toISOString(),
          caption: p.caption,
          mediaUrls: p.mediaUrls ?? [],
          snapshot: p.snapshot ?? [],
          workoutId: p.workoutId,
          routineId: p.routineId,
          bodyMetricId: p.bodyMetricId,
          author: publicUserLite(author),
          likesCount: likeCount.get(p.id) ?? 0,
          commentsCount: commentCount.get(p.id) ?? 0,
          likedByMe: myLikeSet.has(p.id),
        };
      });
  }

  type EnrichedPost = Awaited<ReturnType<typeof enrichPosts>>[number];

  // Busca o post com autor; devolve null se nao existe ou o viewer nao pode ver.
  async function visiblePost(postId: string, viewerId: string) {
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) return null;
    const author = await db.query.users.findFirst({ where: eq(users.id, post.userId) });
    if (!author) return null;
    if (!(await canView(db, viewerId, author))) return null;
    return { post, author };
  }

  // Snapshot do treino: stats + top de cada exercicio (nome incluido).
  async function workoutSnapshot(workoutId: string, userId: string): Promise<WorkoutSnapshot | null> {
    const w = await db.query.workouts.findFirst({
      where: and(eq(workouts.id, workoutId), eq(workouts.userId, userId)),
      with: {
        routine: true,
        sets: { with: { exercise: true } },
      },
    });
    if (!w) return null;

    let setsDone = 0;
    let volumeKg = 0;
    const byExercise = new Map<string, WorkoutSnapshot["exercises"][number]>();
    for (const s of w.sets) {
      if (!s.completed) continue;
      setsDone++;
      volumeKg += s.weight * s.reps;
      const e1rm = estimate1RM(s.weight, s.reps);
      const cur = byExercise.get(s.exerciseId);
      if (!cur) {
        byExercise.set(s.exerciseId, {
          exerciseId: s.exerciseId,
          name: s.exercise?.name ?? "Exercicio",
          sets: 1,
          topWeight: s.weight,
          topReps: s.reps,
          bestE1RM: e1rm,
        });
      } else {
        cur.sets++;
        if (s.weight > cur.topWeight) {
          cur.topWeight = s.weight;
          cur.topReps = s.reps;
        }
        cur.bestE1RM = Math.max(cur.bestE1RM, e1rm);
      }
    }

    return {
      kind: "workout",
      workoutId: w.id,
      routineName: w.routine?.name ?? null,
      startedAt: w.startedAt.toISOString(),
      finishedAt: w.finishedAt?.toISOString() ?? null,
      durationSec: w.finishedAt
        ? Math.max(0, Math.floor((w.finishedAt.getTime() - w.startedAt.getTime()) / 1000))
        : null,
      setsDone,
      volumeKg: Math.round(volumeKg),
      exercises: [...byExercise.values()],
    };
  }

  // Snapshot da rotina: exercicios com nome/grupo/equipamento pra que outro
  // usuario consiga importar mesmo quando o exercicio e custom do autor.
  async function routineSnapshot(routineId: string, userId: string): Promise<RoutineSnapshot | null> {
    const r = await db.query.routines.findFirst({
      where: and(eq(routines.id, routineId), eq(routines.userId, userId)),
      with: {
        exercises: {
          orderBy: (re, { asc }) => [asc(re.order)],
          with: { exercise: true },
        },
      },
    });
    if (!r) return null;
    return {
      kind: "routine",
      name: r.name,
      exercises: r.exercises.map((re) => ({
        exerciseId: re.exerciseId,
        name: re.exercise?.name ?? "Exercicio",
        muscleGroup: re.exercise?.muscleGroup ?? "corpo_todo",
        equipment: re.exercise?.equipment ?? "outro",
        order: re.order,
        targetSets: re.targetSets,
        targetReps: re.targetReps,
        targetWeight: re.targetWeight,
      })),
    };
  }

  async function bodyMetricSnapshot(metricId: string, userId: string): Promise<BodyMetricSnapshot | null> {
    const m = await db.query.bodyMetrics.findFirst({
      where: and(eq(bodyMetrics.id, metricId), eq(bodyMetrics.userId, userId)),
    });
    if (!m) return null;
    return {
      kind: "body_metric",
      date: m.date,
      weightKg: m.weightKg,
      bodyFat: m.bodyFat,
      measurements: m.measurements ?? {},
    };
  }

  // Importa um RoutineSnapshot pro viewer — exercicios custom do autor viram
  // custom do viewer casando por nome. Usado pelo save-routine de post e
  // pelo copiar rotina do perfil.
  async function importRoutine(userId: string, snap: RoutineSnapshot) {
    const mine = await db.query.exercises.findMany({
      where: or(eq(exercises.ownerId, userId), isNull(exercises.ownerId)),
    });
    const usable = new Set(mine.map((e) => e.id));

    const [routine] = await db
      .insert(routines)
      .values({ userId, name: snap.name })
      .returning();

    for (const re of snap.exercises) {
      let exerciseId = re.exerciseId;
      if (!usable.has(exerciseId)) {
        const byName = mine.find(
          (e) => e.name.toLowerCase() === re.name.toLowerCase(),
        );
        if (byName) {
          exerciseId = byName.id;
        } else {
          const [created] = await db
            .insert(exercises)
            .values({
              name: re.name,
              muscleGroup: re.muscleGroup,
              equipment: re.equipment,
              isCustom: true,
              ownerId: userId,
            })
            .returning();
          exerciseId = created!.id;
        }
      }
      await db.insert(routineExercises).values({
        routineId: routine!.id,
        exerciseId,
        order: re.order,
        targetSets: re.targetSets,
        targetReps: re.targetReps,
        targetWeight: re.targetWeight,
      });
    }

    return db.query.routines.findFirst({
      where: eq(routines.id, routine!.id),
      with: {
        exercises: {
          orderBy: (re2, { asc }) => [asc(re2.order)],
          with: { exercise: true },
        },
      },
    });
  }

  // Story visivel pro viewer: existe, nao expirou e o autor pode ser visto.
  async function visibleStory(storyId: string, viewerId: string) {
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), gt(stories.expiresAt, new Date())),
    });
    if (!story) return null;
    const author = await db.query.users.findFirst({ where: eq(users.id, story.userId) });
    if (!author) return null;
    if (viewerId !== story.userId && !(await canView(db, viewerId, author))) return null;
    return { story, author };
  }

  // Ranking + paginacao em cima de uma janela de candidatos.
  function rankAndPage(enriched: EnrichedPost[], page: number, pageSize: number) {
    const ranked = [...enriched].sort(
      (a, b) =>
        rankScore(b) - rankScore(a) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const slice = ranked.slice((page - 1) * pageSize, page * pageSize);
    return { posts: slice, page, pageSize, hasMore: ranked.length > page * pageSize };
  }

  return new Elysia({ prefix: "/social" })
    .use(authService(db))
    .guard({ requireAuth: true })

    // ------------------------------------------------------------------
    // Usuarios: busca, perfil publico, posts do perfil
    // ------------------------------------------------------------------
    .get(
      "/users/search",
      async ({ authUser, query }) => {
        // Busca por nome ou @username — o @ inicial e opcional.
        const q = (query.q ?? "").trim().replace(/^@+/, "");
        if (!q) return { users: [] };
        const rows = await db.query.users.findMany({
          where: and(
            or(ilike(users.name, `%${q}%`), ilike(users.username, `%${q}%`)),
            ne(users.id, authUser!.id),
          ),
          orderBy: [asc(users.username)],
          limit: 20,
        });
        const result = [];
        for (const u of rows) {
          const rel = await followState(db, authUser!.id, u.id);
          const [fc] = await db
            .select({ value: count() })
            .from(follows)
            .where(and(eq(follows.followingId, u.id), eq(follows.status, "accepted")));
          result.push({ ...publicUserLite(u), ...rel, followersCount: fc?.value ?? 0 });
        }
        return { users: result };
      },
      { query: UserSearchQuery },
    )

    .get(
      "/users/:id",
      async ({ authUser, params, set }) => {
        const target = await db.query.users.findFirst({ where: eq(users.id, params.id) });
        if (!target) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Usuario nao encontrado.");
        }
        const [followers, following, postCount] = await Promise.all([
          db
            .select({ value: count() })
            .from(follows)
            .where(and(eq(follows.followingId, target.id), eq(follows.status, "accepted"))),
          db
            .select({ value: count() })
            .from(follows)
            .where(and(eq(follows.followerId, target.id), eq(follows.status, "accepted"))),
          db.select({ value: count() }).from(posts).where(eq(posts.userId, target.id)),
        ]);
        const rel = await followState(db, authUser!.id, target.id);
        const can = await canView(db, authUser!.id, target);
        const isMe = authUser!.id === target.id;

        // Secoes extras do perfil: dono sempre ve as suas; pros outros vale
        // o toggle (showStats/showRoutines/showBodyMetrics).
        let stats = null;
        let latestMetric = null;
        let routinesCount: number | null = null;
        if (can) {
          if (isMe || target.showStats) stats = await userProfileStats(db, target.id);
          if (isMe || target.showBodyMetrics) {
            const m = await db.query.bodyMetrics.findFirst({
              where: eq(bodyMetrics.userId, target.id),
              orderBy: [desc(bodyMetrics.date)],
            });
            if (m) latestMetric = { date: m.date, weightKg: m.weightKg, bodyFat: m.bodyFat };
          }
          if (isMe || target.showRoutines) {
            const [rc] = await db
              .select({ value: count() })
              .from(routines)
              .where(eq(routines.userId, target.id));
            routinesCount = rc?.value ?? 0;
          }
        }

        return {
          profile: {
            ...publicUserLite(target),
            followersCount: followers[0]?.value ?? 0,
            followingCount: following[0]?.value ?? 0,
            postsCount: postCount[0]?.value ?? 0,
            ...rel,
            isMe,
            canView: can,
            showRoutines: target.showRoutines,
            showStats: target.showStats,
            showBodyMetrics: target.showBodyMetrics,
            stats,
            latestMetric,
            routinesCount,
          },
        };
      },
      { params: t.Object({ id: t.String() }) },
    )

    .get(
      "/users/:id/posts",
      async ({ authUser, params, query, set }) => {
        const target = await db.query.users.findFirst({ where: eq(users.id, params.id) });
        if (!target || !(await canView(db, authUser!.id, target))) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Usuario nao encontrado.");
        }
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const rows = await db.query.posts.findMany({
          where: eq(posts.userId, target.id),
          orderBy: [desc(posts.createdAt)],
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        const enriched = await enrichPosts(rows, authUser!.id);
        return { posts: enriched, page, pageSize };
      },
      { params: t.Object({ id: t.String() }), query: PageQuery },
    )

    .get(
      "/users/:id/followers",
      async ({ authUser, params, set }) => {
        const target = await db.query.users.findFirst({ where: eq(users.id, params.id) });
        if (!target || !(await canView(db, authUser!.id, target))) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Usuario nao encontrado.");
        }
        const rows = await db.query.follows.findMany({
          where: and(eq(follows.followingId, target.id), eq(follows.status, "accepted")),
          with: { follower: true },
          orderBy: [desc(follows.createdAt)],
          limit: 100,
        });
        return { users: rows.map((f) => publicUserLite(f.follower)) };
      },
      { params: t.Object({ id: t.String() }) },
    )

    .get(
      "/users/:id/following",
      async ({ authUser, params, set }) => {
        const target = await db.query.users.findFirst({ where: eq(users.id, params.id) });
        if (!target || !(await canView(db, authUser!.id, target))) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Usuario nao encontrado.");
        }
        const rows = await db.query.follows.findMany({
          where: and(eq(follows.followerId, target.id), eq(follows.status, "accepted")),
          with: { following: true },
          orderBy: [desc(follows.createdAt)],
          limit: 100,
        });
        return { users: rows.map((f) => publicUserLite(f.following)) };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // Rotinas publicas do usuario — so quando o dono deixa (showRoutines)
    // ou quando e o proprio perfil.
    .get(
      "/users/:id/routines",
      async ({ authUser, params, set }) => {
        const target = await db.query.users.findFirst({ where: eq(users.id, params.id) });
        const isMe = authUser!.id === params.id;
        if (!target || !(await canView(db, authUser!.id, target)) || (!isMe && !target.showRoutines)) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Usuario nao encontrado.");
        }
        const rows = await db.query.routines.findMany({
          where: eq(routines.userId, target.id),
          orderBy: [desc(routines.createdAt)],
          with: {
            exercises: {
              orderBy: (re, { asc }) => [asc(re.order)],
              with: { exercise: true },
            },
          },
        });
        return {
          routines: rows.map((r) => ({
            id: r.id,
            name: r.name,
            exercises: r.exercises.map((re) => ({
              name: re.exercise?.name ?? "Exercicio",
              targetSets: re.targetSets,
              targetReps: re.targetReps,
              targetWeight: re.targetWeight,
            })),
          })),
        };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // Copia a rotina de outro usuario — mesma importacao do save-routine.
    .post(
      "/users/:id/routines/:routineId/copy",
      async ({ authUser, params, set }) => {
        const target = await db.query.users.findFirst({ where: eq(users.id, params.id) });
        const isMe = authUser!.id === params.id;
        if (!target || !(await canView(db, authUser!.id, target)) || (!isMe && !target.showRoutines)) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Usuario nao encontrado.");
        }
        const snap = await routineSnapshot(params.routineId, target.id);
        if (!snap) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Rotina nao encontrada.");
        }
        const routine = await importRoutine(authUser!.id, snap);
        set.status = 201;
        return { routine };
      },
      { params: t.Object({ id: t.String(), routineId: t.String() }) },
    )

    // ------------------------------------------------------------------
    // Follows e pedidos
    // ------------------------------------------------------------------
    .post(
      "/follows/:userId",
      async ({ authUser, params, set }) => {
        if (params.userId === authUser!.id) {
          set.status = 422;
          return errorBody("VALIDATION", "Voce nao pode seguir a si mesmo.");
        }
        const target = await db.query.users.findFirst({ where: eq(users.id, params.userId) });
        if (!target) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Usuario nao encontrado.");
        }
        const desired = target.isPrivate ? "pending" : "accepted";
        const existing = await db.query.follows.findFirst({
          where: and(
            eq(follows.followerId, authUser!.id),
            eq(follows.followingId, target.id),
          ),
        });
        if (existing) {
          // Pedido pendente e o perfil virou publico: promove pra accepted.
          if (existing.status === "pending" && desired === "accepted") {
            await db
              .update(follows)
              .set({ status: "accepted" })
              .where(eq(follows.id, existing.id));
            await notify(db, target.id, authUser!, "follow");
            return { status: "accepted" };
          }
          return { status: existing.status };
        }
        await db.insert(follows).values({
          followerId: authUser!.id,
          followingId: target.id,
          status: desired,
        });
        await notify(
          db,
          target.id,
          authUser!,
          desired === "pending" ? "follow_request" : "follow",
        );
        set.status = 201;
        return { status: desired };
      },
      { params: t.Object({ userId: t.String() }) },
    )

    // Remove follow aceito ou cancela pedido pendente. Idempotente.
    .delete(
      "/follows/:userId",
      async ({ authUser, params }) => {
        await db
          .delete(follows)
          .where(
            and(
              eq(follows.followerId, authUser!.id),
              eq(follows.followingId, params.userId),
            ),
          );
        return { ok: true };
      },
      { params: t.Object({ userId: t.String() }) },
    )

    // Pedidos pendentes que EU recebi (so faz sentido pra perfil privado).
    .get("/requests", async ({ authUser }) => {
      const rows = await db.query.follows.findMany({
        where: and(eq(follows.followingId, authUser!.id), eq(follows.status, "pending")),
        with: { follower: true },
        orderBy: [desc(follows.createdAt)],
      });
      return { requests: rows.map((f) => publicUserLite(f.follower)) };
    })

    .post(
      "/requests/:userId/accept",
      async ({ authUser, params, set }) => {
        const rel = await db.query.follows.findFirst({
          where: and(
            eq(follows.followerId, params.userId),
            eq(follows.followingId, authUser!.id),
            eq(follows.status, "pending"),
          ),
        });
        if (!rel) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Pedido nao encontrado.");
        }
        await db.update(follows).set({ status: "accepted" }).where(eq(follows.id, rel.id));
        await notify(db, rel.followerId, authUser!, "follow_accepted");
        return { ok: true };
      },
      { params: t.Object({ userId: t.String() }) },
    )

    .post(
      "/requests/:userId/decline",
      async ({ authUser, params, set }) => {
        const rel = await db.query.follows.findFirst({
          where: and(
            eq(follows.followerId, params.userId),
            eq(follows.followingId, authUser!.id),
            eq(follows.status, "pending"),
          ),
        });
        if (!rel) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Pedido nao encontrado.");
        }
        await db.delete(follows).where(eq(follows.id, rel.id));
        return { ok: true };
      },
      { params: t.Object({ userId: t.String() }) },
    )

    // ------------------------------------------------------------------
    // Posts
    // ------------------------------------------------------------------
    .post(
      "/posts",
      async ({ authUser, body, set }) => {
        const caption = body.caption?.trim() || null;
        const mediaUrls = body.mediaUrls ?? [];
        if (!caption && mediaUrls.length === 0 && !body.workoutId && !body.routineId && !body.bodyMetricId) {
          set.status = 422;
          return errorBody("VALIDATION", "O post precisa de texto, foto ou anexo.");
        }

        // Cada anexo precisa existir E ser do autor (ownership do logbook).
        const snapshot: PostSnapshot[] = [];
        if (body.workoutId) {
          const snap = await workoutSnapshot(body.workoutId, authUser!.id);
          if (!snap) {
            set.status = 404;
            return errorBody("NOT_FOUND", "Treino nao encontrado.");
          }
          snapshot.push(snap);
        }
        if (body.routineId) {
          const snap = await routineSnapshot(body.routineId, authUser!.id);
          if (!snap) {
            set.status = 404;
            return errorBody("NOT_FOUND", "Rotina nao encontrada.");
          }
          snapshot.push(snap);
        }
        if (body.bodyMetricId) {
          const snap = await bodyMetricSnapshot(body.bodyMetricId, authUser!.id);
          if (!snap) {
            set.status = 404;
            return errorBody("NOT_FOUND", "Medida nao encontrada.");
          }
          snapshot.push(snap);
        }

        const [post] = await db
          .insert(posts)
          .values({
            userId: authUser!.id,
            caption,
            workoutId: body.workoutId ?? null,
            routineId: body.routineId ?? null,
            bodyMetricId: body.bodyMetricId ?? null,
            mediaUrls,
            snapshot,
          })
          .returning();
        set.status = 201;
        const [enriched] = await enrichPosts([post!], authUser!.id);
        return { post: enriched };
      },
      { body: CreatePostInput },
    )

    .get(
      "/posts/:id",
      async ({ authUser, params, set }) => {
        const found = await visiblePost(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Post nao encontrado.");
        }
        const [enriched] = await enrichPosts([found.post], authUser!.id);
        return { post: enriched };
      },
      { params: t.Object({ id: t.String() }) },
    )

    .delete(
      "/posts/:id",
      async ({ authUser, params, set }) => {
        const post = await db.query.posts.findFirst({ where: eq(posts.id, params.id) });
        if (!post || post.userId !== authUser!.id) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Post nao encontrado.");
        }
        await db.delete(posts).where(eq(posts.id, params.id));
        return { ok: true };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // ------------------------------------------------------------------
    // Likes e comentarios
    // ------------------------------------------------------------------
    .post(
      "/posts/:id/like",
      async ({ authUser, params, set }) => {
        const found = await visiblePost(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Post nao encontrado.");
        }
        const existing = await db.query.postLikes.findFirst({
          where: and(eq(postLikes.postId, params.id), eq(postLikes.userId, authUser!.id)),
        });
        if (!existing) {
          await db.insert(postLikes).values({ postId: params.id, userId: authUser!.id });
          await notify(db, found.post.userId, authUser!, "like", { postId: params.id });
        }
        const [c] = await db
          .select({ value: count() })
          .from(postLikes)
          .where(eq(postLikes.postId, params.id));
        return { liked: true, likesCount: c?.value ?? 0 };
      },
      { params: t.Object({ id: t.String() }) },
    )

    .delete(
      "/posts/:id/like",
      async ({ authUser, params, set }) => {
        const found = await visiblePost(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Post nao encontrado.");
        }
        await db
          .delete(postLikes)
          .where(and(eq(postLikes.postId, params.id), eq(postLikes.userId, authUser!.id)));
        const [c] = await db
          .select({ value: count() })
          .from(postLikes)
          .where(eq(postLikes.postId, params.id));
        return { liked: false, likesCount: c?.value ?? 0 };
      },
      { params: t.Object({ id: t.String() }) },
    )

    .get(
      "/posts/:id/comments",
      async ({ authUser, params, query, set }) => {
        const found = await visiblePost(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Post nao encontrado.");
        }
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 50;
        const rows = await db.query.postComments.findMany({
          where: eq(postComments.postId, params.id),
          with: { user: true },
          orderBy: [asc(postComments.createdAt)],
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        return {
          comments: rows.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            user: publicUserLite(c.user),
            isMine: c.userId === authUser!.id,
          })),
          page,
          pageSize,
        };
      },
      { params: t.Object({ id: t.String() }), query: PageQuery },
    )

    .post(
      "/posts/:id/comments",
      async ({ authUser, params, body, set }) => {
        const found = await visiblePost(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Post nao encontrado.");
        }
        const [comment] = await db
          .insert(postComments)
          .values({ postId: params.id, userId: authUser!.id, body: body.body.trim() })
          .returning();
        await notify(db, found.post.userId, authUser!, "comment", { postId: params.id });
        set.status = 201;
        return {
          comment: {
            id: comment!.id,
            body: comment!.body,
            createdAt: comment!.createdAt.toISOString(),
            user: publicUserLite(authUser!),
            isMine: true,
          },
        };
      },
      { params: t.Object({ id: t.String() }), body: CreateCommentInput },
    )

    // Apaga comentario: autor do comentario ou dono do post (moderacao basica).
    .delete(
      "/comments/:id",
      async ({ authUser, params, set }) => {
        const comment = await db.query.postComments.findFirst({
          where: eq(postComments.id, params.id),
        });
        if (!comment) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Comentario nao encontrado.");
        }
        const post = await db.query.posts.findFirst({ where: eq(posts.id, comment.postId) });
        if (comment.userId !== authUser!.id && post?.userId !== authUser!.id) {
          set.status = 403;
          return errorBody("FORBIDDEN", "Isso nao e seu.");
        }
        await db.delete(postComments).where(eq(postComments.id, params.id));
        return { ok: true };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // Quem curtiu o post — com estado de seguir inline pra cada um.
    .get(
      "/posts/:id/likes",
      async ({ authUser, params, set }) => {
        const found = await visiblePost(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Post nao encontrado.");
        }
        const rows = await db.query.postLikes.findMany({
          where: eq(postLikes.postId, params.id),
          with: { user: true },
          orderBy: [desc(postLikes.createdAt)],
          limit: 100,
        });
        const likerIds = rows.map((l) => l.userId);
        const rels = likerIds.length
          ? await db.query.follows.findMany({
              where: and(
                eq(follows.followerId, authUser!.id),
                inArray(follows.followingId, likerIds),
              ),
            })
          : [];
        const relMap = new Map(rels.map((r) => [r.followingId, r.status]));
        return {
          users: rows.map((l) => ({
            ...publicUserLite(l.user),
            isMe: l.userId === authUser!.id,
            isFollowing: relMap.get(l.userId) === "accepted",
            isPending: relMap.get(l.userId) === "pending",
          })),
        };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // ------------------------------------------------------------------
    // Notificacoes (aba Atividade) + push tokens
    // ------------------------------------------------------------------
    .get("/notifications", async ({ authUser }) => {
      const rows = await db.query.notifications.findMany({
        where: eq(notifications.userId, authUser!.id),
        with: { actor: true },
        orderBy: [desc(notifications.createdAt)],
        limit: 100,
      });

      // Pedidos de follow ainda pendentes ganham botoes Aceitar/Recusar.
      const requestActorIds = rows
        .filter((n) => n.type === "follow_request")
        .map((n) => n.actorId);
      const pending = requestActorIds.length
        ? await db.query.follows.findMany({
            where: and(
              eq(follows.followingId, authUser!.id),
              eq(follows.status, "pending"),
              inArray(follows.followerId, requestActorIds),
            ),
            columns: { followerId: true },
          })
        : [];
      const pendingSet = new Set(pending.map((f) => f.followerId));

      return {
        notifications: rows.map((n) => ({
          id: n.id,
          type: n.type,
          createdAt: n.createdAt.toISOString(),
          seen: n.seenAt !== null,
          postId: n.postId,
          storyId: n.storyId,
          actor: publicUserLite(n.actor),
          requestPending: n.type === "follow_request" && pendingSet.has(n.actorId),
        })),
      };
    })

    .get("/notifications/unread-count", async ({ authUser }) => {
      const [c] = await db
        .select({ value: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, authUser!.id), isNull(notifications.seenAt)));
      return { count: c?.value ?? 0 };
    })

    .post("/notifications/read", async ({ authUser }) => {
      await db
        .update(notifications)
        .set({ seenAt: new Date() })
        .where(and(eq(notifications.userId, authUser!.id), isNull(notifications.seenAt)));
      return { ok: true };
    })

    // Registra/remove Expo push token do device atual.
    .post(
      "/push-token",
      async ({ authUser, body }) => {
        await db
          .insert(pushTokens)
          .values({
            userId: authUser!.id,
            token: body.token,
            platform: body.platform ?? null,
          })
          .onConflictDoNothing();
        return { ok: true };
      },
      { body: PushTokenInput },
    )

    .delete(
      "/push-token",
      async ({ authUser, body }) => {
        await db
          .delete(pushTokens)
          .where(and(eq(pushTokens.userId, authUser!.id), eq(pushTokens.token, body.token)));
        return { ok: true };
      },
      { body: PushTokenInput },
    )

    // ------------------------------------------------------------------
    // Feed e descobrir
    // ------------------------------------------------------------------
    // Seguindo: posts de quem eu sigo (accepted) + meus, ranqueados.
    .get(
      "/feed",
      async ({ authUser, query }) => {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const rels = await db.query.follows.findMany({
          where: and(eq(follows.followerId, authUser!.id), eq(follows.status, "accepted")),
          columns: { followingId: true },
        });
        const authorIds = [authUser!.id, ...rels.map((r) => r.followingId)];
        const rows = await db.query.posts.findMany({
          where: inArray(posts.userId, authorIds),
          orderBy: [desc(posts.createdAt)],
          limit: FEED_CANDIDATES,
        });
        const enriched = await enrichPosts(rows, authUser!.id);
        return rankAndPage(enriched, page, pageSize);
      },
      { query: PageQuery },
    )

    // Descobrir: posts globais de perfis publicos, ranqueados. Traz tambem
    // sugestoes de usuarios pra seguir (publicos que eu ainda nao sigo).
    .get(
      "/discover",
      async ({ authUser, query }) => {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const rows = await db.query.posts.findMany({
          orderBy: [desc(posts.createdAt)],
          limit: FEED_CANDIDATES,
        });
        const enriched = (await enrichPosts(rows, authUser!.id)).filter(
          (p) => !p.author.isPrivate,
        );

        const myRels = await db.query.follows.findMany({
          where: eq(follows.followerId, authUser!.id),
          columns: { followingId: true },
        });
        const excluded = [authUser!.id, ...myRels.map((r) => r.followingId)];
        const suggestedRows = await db.query.users.findMany({
          where: and(eq(users.isPrivate, false), notInArray(users.id, excluded)),
          orderBy: [asc(users.createdAt)],
          limit: 8,
        });
        const suggested = [];
        for (const u of suggestedRows) {
          const [fc] = await db
            .select({ value: count() })
            .from(follows)
            .where(and(eq(follows.followingId, u.id), eq(follows.status, "accepted")));
          suggested.push({ ...publicUserLite(u), followersCount: fc?.value ?? 0 });
        }

        return { ...rankAndPage(enriched, page, pageSize), suggested };
      },
      { query: PageQuery },
    )

    // ------------------------------------------------------------------
    // Stories (24h)
    // ------------------------------------------------------------------
    // Stories ativos = meus + de quem eu sigo (accepted). Agrupados por autor
    // no cliente. Perfil privado ja entra so via follow aceito.
    .get("/stories", async ({ authUser }) => {
      const rels = await db.query.follows.findMany({
        where: and(eq(follows.followerId, authUser!.id), eq(follows.status, "accepted")),
        columns: { followingId: true },
      });
      const authorIds = [authUser!.id, ...rels.map((r) => r.followingId)];
      const rows = await db.query.stories.findMany({
        where: and(
          inArray(stories.userId, authorIds),
          gt(stories.expiresAt, new Date()),
        ),
        with: { user: true },
        orderBy: [asc(stories.createdAt)],
      });

      // Views e likes em batch: contagens + flags do viewer + lista de
      // viewers (entregue so nos stories do proprio usuario).
      const storyIds = rows.map((s) => s.id);
      const [views, likes] = storyIds.length
        ? await Promise.all([
            db.query.storyViews.findMany({
              where: inArray(storyViews.storyId, storyIds),
              with: { user: true },
            }),
            db.query.storyLikes.findMany({
              where: inArray(storyLikes.storyId, storyIds),
              columns: { storyId: true, userId: true },
            }),
          ])
        : [[], []];

      const viewsByStory = new Map<string, typeof views>();
      const likedSet = new Set(likes.map((l) => `${l.storyId}:${l.userId}`));
      const myViewed = new Set<string>();
      const myLiked = new Set<string>();
      const likeCount = new Map<string, number>();
      for (const v of views) {
        viewsByStory.set(v.storyId, [...(viewsByStory.get(v.storyId) ?? []), v]);
        if (v.userId === authUser!.id) myViewed.add(v.storyId);
      }
      for (const l of likes) {
        likeCount.set(l.storyId, (likeCount.get(l.storyId) ?? 0) + 1);
        if (l.userId === authUser!.id) myLiked.add(l.storyId);
      }

      return {
        stories: rows.map((s) => ({
          id: s.id,
          mediaUrl: s.mediaUrl,
          caption: s.caption,
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          user: publicUserLite(s.user),
          isMine: s.userId === authUser!.id,
          viewCount: viewsByStory.get(s.id)?.length ?? 0,
          viewedByMe: myViewed.has(s.id),
          likeCount: likeCount.get(s.id) ?? 0,
          likedByMe: myLiked.has(s.id),
          // "Visto por" + coracaozinho em quem curtiu — so o autor recebe.
          viewers:
            s.userId === authUser!.id
              ? (viewsByStory.get(s.id) ?? []).map((v) => ({
                  user: publicUserLite(v.user),
                  liked: likedSet.has(`${s.id}:${v.userId}`),
                }))
              : [],
        })),
      };
    })

    // Marca que eu vi o story (idempotente; o autor nao "ve" o proprio).
    .post(
      "/stories/:id/view",
      async ({ authUser, params, set }) => {
        const found = await visibleStory(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Story nao encontrado.");
        }
        if (found.story.userId !== authUser!.id) {
          await db
            .insert(storyViews)
            .values({ storyId: params.id, userId: authUser!.id })
            .onConflictDoNothing();
        }
        return { ok: true };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // Like privado de story — o autor ve quem curtiu na lista "Visto por".
    .post(
      "/stories/:id/like",
      async ({ authUser, params, set }) => {
        const found = await visibleStory(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Story nao encontrado.");
        }
        const existing = await db.query.storyLikes.findFirst({
          where: and(eq(storyLikes.storyId, params.id), eq(storyLikes.userId, authUser!.id)),
        });
        if (!existing) {
          await db.insert(storyLikes).values({ storyId: params.id, userId: authUser!.id });
          await notify(db, found.story.userId, authUser!, "story_like", { storyId: params.id });
        }
        return { liked: true };
      },
      { params: t.Object({ id: t.String() }) },
    )

    .delete(
      "/stories/:id/like",
      async ({ authUser, params, set }) => {
        const found = await visibleStory(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Story nao encontrado.");
        }
        await db
          .delete(storyLikes)
          .where(and(eq(storyLikes.storyId, params.id), eq(storyLikes.userId, authUser!.id)));
        return { liked: false };
      },
      { params: t.Object({ id: t.String() }) },
    )

    .post(
      "/stories",
      async ({ authUser, body, set }) => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const [story] = await db
          .insert(stories)
          .values({
            userId: authUser!.id,
            mediaUrl: body.mediaUrl,
            caption: body.caption?.trim() || null,
            expiresAt,
          })
          .returning();
        set.status = 201;
        return {
          story: {
            id: story!.id,
            mediaUrl: story!.mediaUrl,
            caption: story!.caption,
            createdAt: story!.createdAt.toISOString(),
            expiresAt: story!.expiresAt.toISOString(),
          },
        };
      },
      { body: CreateStoryInput },
    )

    .delete(
      "/stories/:id",
      async ({ authUser, params, set }) => {
        const story = await db.query.stories.findFirst({
          where: eq(stories.id, params.id),
        });
        if (!story || story.userId !== authUser!.id) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Story nao encontrado.");
        }
        await db.delete(stories).where(eq(stories.id, params.id));
        return { ok: true };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // ------------------------------------------------------------------
    // Importar rotina compartilhada (estilo Hevy)
    // ------------------------------------------------------------------
    .post(
      "/posts/:id/save-routine",
      async ({ authUser, params, set }) => {
        const found = await visiblePost(params.id, authUser!.id);
        if (!found) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Post nao encontrado.");
        }
        const snap = (found.post.snapshot ?? []).find(
          (s): s is RoutineSnapshot => s.kind === "routine",
        );
        if (!snap) {
          set.status = 422;
          return errorBody("VALIDATION", "Esse post nao tem rotina pra salvar.");
        }

        const created = await importRoutine(authUser!.id, snap);
        set.status = 201;
        return { routine: created };
      },
      { params: t.Object({ id: t.String() }) },
    );
}
