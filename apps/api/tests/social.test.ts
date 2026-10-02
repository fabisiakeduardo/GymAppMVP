import { describe, it, expect, beforeEach } from "bun:test";
import { req, resetDb, registerUser } from "./helpers";

async function firstExerciseId(token: string) {
  const { body } = await req("/exercises", { token });
  return body.exercises[0].id as string;
}

// Cria um treino finalizado com uma serie e devolve o id.
async function finishedWorkout(token: string, exerciseId: string) {
  const w = await req("/workouts", { method: "POST", token, body: {} });
  await req(`/workouts/${w.body.workout.id}/sets`, {
    method: "POST",
    token,
    body: { exerciseId, setNumber: 1, reps: 8, weight: 80, completed: true },
  });
  await req(`/workouts/${w.body.workout.id}`, { method: "PATCH", token, body: {} });
  return w.body.workout.id as string;
}

describe("social: follows e privacidade", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("seguir perfil publico aceita na hora", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");

    const res = await req(`/social/follows/${b.user.id}`, {
      method: "POST",
      token: a.accessToken,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("accepted");
  });

  it("perfil privado gera pedido pendente ate aceitar", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");

    await req("/auth/me", {
      method: "PATCH",
      token: b.accessToken,
      body: { isPrivate: true },
    });

    const follow = await req(`/social/follows/${b.user.id}`, {
      method: "POST",
      token: a.accessToken,
    });
    expect(follow.status).toBe(201);
    expect(follow.body.status).toBe("pending");

    // Pedido aparece na fila de B
    const requests = await req("/social/requests", { token: b.accessToken });
    expect(requests.body.requests).toHaveLength(1);
    expect(requests.body.requests[0].id).toBe(a.user.id);

    // Aceita -> vira accepted
    const accept = await req(`/social/requests/${a.user.id}/accept`, {
      method: "POST",
      token: b.accessToken,
    });
    expect(accept.status).toBe(200);

    const profile = await req(`/social/users/${b.user.id}`, { token: a.accessToken });
    expect(profile.body.profile.isFollowing).toBe(true);
    expect(profile.body.profile.canView).toBe(true);
  });

  it("post de perfil privado nao vaza pra quem nao segue", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const c = await registerUser("c@teste.com");

    await req("/auth/me", {
      method: "PATCH",
      token: b.accessToken,
      body: { isPrivate: true },
    });
    const post = await req("/social/posts", {
      method: "POST",
      token: b.accessToken,
      body: { caption: "treino pesado hoje" },
    });
    expect(post.status).toBe(201);

    // C nao segue B: post individual e perfil bloqueados
    const asC = await req(`/social/posts/${post.body.post.id}`, { token: c.accessToken });
    expect(asC.status).toBe(404);
    const postsC = await req(`/social/users/${b.user.id}/posts`, { token: c.accessToken });
    expect(postsC.status).toBe(404);

    // C segue B (pendente) -> ainda nao ve
    await req(`/social/follows/${b.user.id}`, { method: "POST", token: c.accessToken });
    const pending = await req(`/social/posts/${post.body.post.id}`, { token: c.accessToken });
    expect(pending.status).toBe(404);

    // B aceita -> C passa a ver
    await req(`/social/requests/${c.user.id}/accept`, { method: "POST", token: b.accessToken });
    const accepted = await req(`/social/posts/${post.body.post.id}`, { token: c.accessToken });
    expect(accepted.status).toBe(200);

    // E o descobrir (global) nunca inclui posts de privado
    const discover = await req("/social/discover", { token: a.accessToken });
    expect(
      discover.body.posts.every((p: { author: { id: string } }) => p.author.id !== b.user.id),
    ).toBe(true);
  });

  it("nao deixa seguir a si mesmo", async () => {
    const a = await registerUser("a@teste.com");
    const res = await req(`/social/follows/${a.user.id}`, {
      method: "POST",
      token: a.accessToken,
    });
    expect(res.status).toBe(422);
  });

  it("unfollow remove a relacao", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    await req(`/social/follows/${b.user.id}`, { method: "POST", token: a.accessToken });

    const del = await req(`/social/follows/${b.user.id}`, {
      method: "DELETE",
      token: a.accessToken,
    });
    expect(del.status).toBe(200);

    const profile = await req(`/social/users/${b.user.id}`, { token: a.accessToken });
    expect(profile.body.profile.isFollowing).toBe(false);
    expect(profile.body.profile.followersCount).toBe(0);
  });
});

describe("social: posts, likes e comentarios", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("post com treino gera snapshot com stats", async () => {
    const a = await registerUser("a@teste.com");
    const exerciseId = await firstExerciseId(a.accessToken);
    const workoutId = await finishedWorkout(a.accessToken, exerciseId);

    const res = await req("/social/posts", {
      method: "POST",
      token: a.accessToken,
      body: { caption: "PR novo", workoutId },
    });
    expect(res.status).toBe(201);
    const snap = res.body.post.snapshot[0];
    expect(snap.kind).toBe("workout");
    expect(snap.setsDone).toBe(1);
    expect(snap.volumeKg).toBe(640);
    expect(snap.exercises[0].topWeight).toBe(80);
  });

  it("post totalmente vazio da 422", async () => {
    const a = await registerUser("a@teste.com");
    const res = await req("/social/posts", {
      method: "POST",
      token: a.accessToken,
      body: {},
    });
    expect(res.status).toBe(422);
  });

  it("nao deixa anexar treino de outro usuario", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const exerciseId = await firstExerciseId(a.accessToken);
    const workoutId = await finishedWorkout(a.accessToken, exerciseId);

    const res = await req("/social/posts", {
      method: "POST",
      token: b.accessToken,
      body: { workoutId },
    });
    expect(res.status).toBe(404);
  });

  it("like e idempotente e unlike decrementa", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const post = await req("/social/posts", {
      method: "POST",
      token: a.accessToken,
      body: { caption: "oi" },
    });
    const postId = post.body.post.id;

    const l1 = await req(`/social/posts/${postId}/like`, {
      method: "POST",
      token: b.accessToken,
    });
    expect(l1.body.likesCount).toBe(1);
    const l2 = await req(`/social/posts/${postId}/like`, {
      method: "POST",
      token: b.accessToken,
    });
    expect(l2.body.likesCount).toBe(1);

    const un = await req(`/social/posts/${postId}/like`, {
      method: "DELETE",
      token: b.accessToken,
    });
    expect(un.body.likesCount).toBe(0);
    expect(un.body.liked).toBe(false);
  });

  it("comenta, lista e so autor ou dono do post apaga", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const c = await registerUser("c@teste.com");
    const post = await req("/social/posts", {
      method: "POST",
      token: a.accessToken,
      body: { caption: "post do A" },
    });
    const postId = post.body.post.id;

    const comment = await req(`/social/posts/${postId}/comments`, {
      method: "POST",
      token: b.accessToken,
      body: { body: "monstro!" },
    });
    expect(comment.status).toBe(201);

    const list = await req(`/social/posts/${postId}/comments`, { token: c.accessToken });
    expect(list.body.comments).toHaveLength(1);
    expect(list.body.comments[0].user.name).toBe("Maromba");

    // C (terceiro) nao pode apagar comentario de B
    const denied = await req(`/social/comments/${comment.body.comment.id}`, {
      method: "DELETE",
      token: c.accessToken,
    });
    expect(denied.status).toBe(403);

    // Dono do post pode apagar (moderacao)
    const byOwner = await req(`/social/comments/${comment.body.comment.id}`, {
      method: "DELETE",
      token: a.accessToken,
    });
    expect(byOwner.status).toBe(200);
  });

  it("feed seguindo mostra posts de seguidos e meus", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const c = await registerUser("c@teste.com");

    await req("/social/posts", { method: "POST", token: b.accessToken, body: { caption: "do B" } });
    await req("/social/posts", { method: "POST", token: c.accessToken, body: { caption: "do C" } });
    await req("/social/posts", { method: "POST", token: a.accessToken, body: { caption: "meu" } });

    // A nao segue ninguem: so o proprio post
    const lonely = await req("/social/feed", { token: a.accessToken });
    expect(lonely.body.posts).toHaveLength(1);

    await req(`/social/follows/${b.user.id}`, { method: "POST", token: a.accessToken });
    const feed = await req("/social/feed", { token: a.accessToken });
    const captions = feed.body.posts.map((p: { caption: string }) => p.caption).sort();
    expect(captions).toEqual(["do B", "meu"]);
  });
});

describe("social: stories (24h)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const FAKE_IMG = "data:image/jpeg;base64,/9j/fake";

  it("story do proprio e de seguidos aparece na lista", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const c = await registerUser("c@teste.com");

    await req("/social/stories", {
      method: "POST",
      token: a.accessToken,
      body: { mediaUrl: FAKE_IMG, caption: "meu" },
    });
    await req("/social/stories", {
      method: "POST",
      token: b.accessToken,
      body: { mediaUrl: FAKE_IMG },
    });
    await req("/social/stories", {
      method: "POST",
      token: c.accessToken,
      body: { mediaUrl: FAKE_IMG },
    });

    // A nao segue ninguem: so o proprio story
    let res = await req("/social/stories", { token: a.accessToken });
    expect(res.body.stories).toHaveLength(1);
    expect(res.body.stories[0].isMine).toBe(true);

    // A segue B -> ve os dois; story de C nao aparece
    await req(`/social/follows/${b.user.id}`, { method: "POST", token: a.accessToken });
    res = await req("/social/stories", { token: a.accessToken });
    const authors = res.body.stories.map((s: { user: { id: string } }) => s.user.id).sort();
    expect(authors).toEqual([a.user.id, b.user.id].sort());
  });

  it("story de perfil privado nao aparece pra nao-seguidor", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    await req("/auth/me", {
      method: "PATCH",
      token: b.accessToken,
      body: { isPrivate: true },
    });
    await req("/social/stories", {
      method: "POST",
      token: b.accessToken,
      body: { mediaUrl: FAKE_IMG },
    });

    // A pede pra seguir -> pendente, ainda nao ve story
    await req(`/social/follows/${b.user.id}`, { method: "POST", token: a.accessToken });
    let res = await req("/social/stories", { token: a.accessToken });
    expect(res.body.stories).toHaveLength(0);

    // B aceita -> A passa a ver
    await req(`/social/requests/${a.user.id}/accept`, { method: "POST", token: b.accessToken });
    res = await req("/social/stories", { token: a.accessToken });
    expect(res.body.stories).toHaveLength(1);
  });

  it("so o autor apaga o proprio story", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const created = await req("/social/stories", {
      method: "POST",
      token: a.accessToken,
      body: { mediaUrl: FAKE_IMG },
    });
    const storyId = created.body.story.id;

    const asB = await req(`/social/stories/${storyId}`, {
      method: "DELETE",
      token: b.accessToken,
    });
    expect(asB.status).toBe(404);

    const asA = await req(`/social/stories/${storyId}`, {
      method: "DELETE",
      token: a.accessToken,
    });
    expect(asA.status).toBe(200);
  });
});

describe("social: rotina compartilhada", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("save-routine copia a rotina do post pro viewer", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const exerciseId = await firstExerciseId(a.accessToken);

    const routine = await req("/routines", {
      method: "POST",
      token: a.accessToken,
      body: {
        name: "Push day",
        exercises: [
          { exerciseId, order: 0, targetSets: 4, targetReps: 8, targetWeight: 60 },
        ],
      },
    });

    const post = await req("/social/posts", {
      method: "POST",
      token: a.accessToken,
      body: { caption: "minha rotina de push", routineId: routine.body.routine.id },
    });
    expect(post.status).toBe(201);

    const saved = await req(`/social/posts/${post.body.post.id}/save-routine`, {
      method: "POST",
      token: b.accessToken,
    });
    expect(saved.status).toBe(201);
    expect(saved.body.routine.name).toBe("Push day");
    expect(saved.body.routine.userId).toBe(b.user.id);
    expect(saved.body.routine.exercises).toHaveLength(1);
    expect(saved.body.routine.exercises[0].targetSets).toBe(4);
  });

  it("save-routine em post sem rotina da 422", async () => {
    const a = await registerUser("a@teste.com");
    const post = await req("/social/posts", {
      method: "POST",
      token: a.accessToken,
      body: { caption: "so texto" },
    });
    const res = await req(`/social/posts/${post.body.post.id}/save-routine`, {
      method: "POST",
      token: a.accessToken,
    });
    expect(res.status).toBe(422);
  });
});

describe("social: notificacoes", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("follow publico gera notificacao 'follow'", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");

    await req(`/social/follows/${b.user.id}`, { method: "POST", token: a.accessToken });

    const res = await req("/social/notifications", { token: b.accessToken });
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].type).toBe("follow");
    expect(res.body.notifications[0].actor.id).toBe(a.user.id);
    expect(res.body.notifications[0].seen).toBe(false);
  });

  it("perfil privado gera 'follow_request' com requestPending ate aceitar", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    await req("/auth/me", {
      method: "PATCH",
      token: b.accessToken,
      body: { isPrivate: true },
    });

    await req(`/social/follows/${b.user.id}`, { method: "POST", token: a.accessToken });
    let notifs = await req("/social/notifications", { token: b.accessToken });
    expect(notifs.body.notifications[0].type).toBe("follow_request");
    expect(notifs.body.notifications[0].requestPending).toBe(true);

    // Aceitar gera 'follow_accepted' pra quem pediu
    await req(`/social/requests/${a.user.id}/accept`, {
      method: "POST",
      token: b.accessToken,
    });
    const mine = await req("/social/notifications", { token: a.accessToken });
    expect(mine.body.notifications[0].type).toBe("follow_accepted");

    // E o pedido deixa de estar pendente
    notifs = await req("/social/notifications", { token: b.accessToken });
    expect(notifs.body.notifications[0].requestPending).toBe(false);
  });

  it("like e comentario notificam o dono do post; curtir o proprio nao", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const post = await req("/social/posts", {
      method: "POST",
      token: a.accessToken,
      body: { caption: "post do A" },
    });
    const postId = post.body.post.id;

    // Acurtir o proprio post nao notifica
    await req(`/social/posts/${postId}/like`, { method: "POST", token: a.accessToken });
    await req(`/social/posts/${postId}/comments`, {
      method: "POST",
      token: a.accessToken,
      body: { body: "eu mesmo" },
    });
    let notifs = await req("/social/notifications", { token: a.accessToken });
    expect(notifs.body.notifications).toHaveLength(0);

    await req(`/social/posts/${postId}/like`, { method: "POST", token: b.accessToken });
    await req(`/social/posts/${postId}/comments`, {
      method: "POST",
      token: b.accessToken,
      body: { body: "brabo" },
    });
    notifs = await req("/social/notifications", { token: a.accessToken });
    const types = notifs.body.notifications.map((n: { type: string }) => n.type).sort();
    expect(types).toEqual(["comment", "like"]);
    expect(notifs.body.notifications.every((n: { postId: string }) => n.postId === postId)).toBe(true);
  });

  it("unread-count conta nao lidas e read zera", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");

    await req(`/social/follows/${b.user.id}`, { method: "POST", token: a.accessToken });
    let unread = await req("/social/notifications/unread-count", { token: b.accessToken });
    expect(unread.body.count).toBe(1);

    await req("/social/notifications/read", { method: "POST", token: b.accessToken });
    unread = await req("/social/notifications/unread-count", { token: b.accessToken });
    expect(unread.body.count).toBe(0);

    const list = await req("/social/notifications", { token: b.accessToken });
    expect(list.body.notifications[0].seen).toBe(true);
  });

  it("quem curtiu lista likers com estado de seguir", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const c = await registerUser("c@teste.com");
    const post = await req("/social/posts", {
      method: "POST",
      token: a.accessToken,
      body: { caption: "post" },
    });
    const postId = post.body.post.id;

    await req(`/social/posts/${postId}/like`, { method: "POST", token: b.accessToken });
    await req(`/social/posts/${postId}/like`, { method: "POST", token: c.accessToken });
    // A segue B mas nao C
    await req(`/social/follows/${b.user.id}`, { method: "POST", token: a.accessToken });

    const res = await req(`/social/posts/${postId}/likes`, { token: a.accessToken });
    expect(res.body.users).toHaveLength(2);
    const likerB = res.body.users.find((u: { id: string }) => u.id === b.user.id);
    const likerC = res.body.users.find((u: { id: string }) => u.id === c.user.id);
    expect(likerB.isFollowing).toBe(true);
    expect(likerC.isFollowing).toBe(false);
  });
});

describe("social: story views e likes", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const FAKE_IMG = "data:image/jpeg;base64,/9j/fake";

  async function postStory(token: string) {
    const res = await req("/social/stories", {
      method: "POST",
      token,
      body: { mediaUrl: FAKE_IMG },
    });
    return res.body.story.id as string;
  }

  it("view e idempotente e viewers so aparecem pro autor", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const storyId = await postStory(a.accessToken);
    await req(`/social/follows/${a.user.id}`, { method: "POST", token: b.accessToken });

    // B ve duas vezes -> conta uma
    await req(`/social/stories/${storyId}/view`, { method: "POST", token: b.accessToken });
    await req(`/social/stories/${storyId}/view`, { method: "POST", token: b.accessToken });

    const asAuthor = await req("/social/stories", { token: a.accessToken });
    const mine = asAuthor.body.stories.find((s: { id: string }) => s.id === storyId);
    expect(mine.viewCount).toBe(1);
    expect(mine.viewers).toHaveLength(1);
    expect(mine.viewers[0].user.id).toBe(b.user.id);

    // B nao recebe a lista de viewers (so flags dele)
    const asViewer = await req("/social/stories", { token: b.accessToken });
    const seen = asViewer.body.stories.find((s: { id: string }) => s.id === storyId);
    expect(seen.viewedByMe).toBe(true);
    expect(seen.viewers).toHaveLength(0);
  });

  it("like de story notifica o autor e aparece no 'visto por'", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const storyId = await postStory(a.accessToken);
    await req(`/social/follows/${a.user.id}`, { method: "POST", token: b.accessToken });
    await req(`/social/stories/${storyId}/view`, { method: "POST", token: b.accessToken });

    await req(`/social/stories/${storyId}/like`, { method: "POST", token: b.accessToken });

    const notifs = await req("/social/notifications", { token: a.accessToken });
    expect(notifs.body.notifications[0].type).toBe("story_like");
    expect(notifs.body.notifications[0].storyId).toBe(storyId);

    const asAuthor = await req("/social/stories", { token: a.accessToken });
    const mine = asAuthor.body.stories.find((s: { id: string }) => s.id === storyId);
    expect(mine.likeCount).toBe(1);
    expect(mine.viewers[0].liked).toBe(true);

    // Deslike remove
    await req(`/social/stories/${storyId}/like`, { method: "DELETE", token: b.accessToken });
    const after = await req("/social/stories", { token: a.accessToken });
    const same = after.body.stories.find((s: { id: string }) => s.id === storyId);
    expect(same.likeCount).toBe(0);
    expect(same.viewers[0].liked).toBe(false);
  });
});

describe("social: perfil enriquecido", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("stats aparecem por padrao; medidas so com showBodyMetrics", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const exerciseId = await firstExerciseId(a.accessToken);
    await finishedWorkout(a.accessToken, exerciseId);
    await req("/body-metrics", {
      method: "POST",
      token: a.accessToken,
      body: { weightKg: 80, bodyFat: 15 },
    });

    let profile = await req(`/social/users/${a.user.id}`, { token: b.accessToken });
    expect(profile.body.profile.stats.totalWorkouts).toBe(1);
    expect(profile.body.profile.stats.totalVolumeKg).toBe(640);
    // showBodyMetrics default false: escondido
    expect(profile.body.profile.latestMetric).toBeNull();

    await req("/auth/me", {
      method: "PATCH",
      token: a.accessToken,
      body: { showBodyMetrics: true },
    });
    profile = await req(`/social/users/${a.user.id}`, { token: b.accessToken });
    expect(profile.body.profile.latestMetric.weightKg).toBe(80);
  });

  it("rotinas do perfil respeitam showRoutines e copia funciona", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const exerciseId = await firstExerciseId(a.accessToken);
    const routine = await req("/routines", {
      method: "POST",
      token: a.accessToken,
      body: {
        name: "Push day",
        exercises: [{ exerciseId, order: 0, targetSets: 4, targetReps: 8, targetWeight: 60 }],
      },
    });

    let list = await req(`/social/users/${a.user.id}/routines`, { token: b.accessToken });
    expect(list.body.routines).toHaveLength(1);
    expect(list.body.routines[0].exercises[0].targetSets).toBe(4);

    const copy = await req(
      `/social/users/${a.user.id}/routines/${routine.body.routine.id}/copy`,
      { method: "POST", token: b.accessToken },
    );
    expect(copy.status).toBe(201);
    expect(copy.body.routine.name).toBe("Push day");

    // Desliga o toggle -> some pros outros
    await req("/auth/me", {
      method: "PATCH",
      token: a.accessToken,
      body: { showRoutines: false },
    });
    list = await req(`/social/users/${a.user.id}/routines`, { token: b.accessToken });
    expect(list.status).toBe(404);
  });
});
