import { Elysia, t } from "elysia";
import { eq, and, desc, count } from "drizzle-orm";
import { workouts, workoutSets, type Database } from "@gymapp/db";
import {
  StartWorkoutInput,
  FinishWorkoutInput,
  LogSetInput,
} from "@gymapp/shared";
import { authService } from "../plugins/auth";
import { errorBody } from "../lib/errors";

export function workoutRoutes(db: Database) {
  return new Elysia({ prefix: "/workouts" })
    .use(authService(db))
    .guard({ requireAuth: true })

    // Inicia um treino (ao vivo). routineId opcional (treino solto tambem vale).
    .post(
      "/",
      async ({ authUser, body, set }) => {
        const [workout] = await db
          .insert(workouts)
          .values({
            userId: authUser!.id,
            routineId: body.routineId ?? null,
            notes: body.notes ?? null,
          })
          .returning();
        set.status = 201;
        return { workout };
      },
      { body: StartWorkoutInput },
    )

    // Historico paginado (mais recente primeiro).
    .get(
      "/",
      async ({ authUser, query }) => {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const rows = await db.query.workouts.findMany({
          where: eq(workouts.userId, authUser!.id),
          orderBy: [desc(workouts.startedAt)],
          limit: pageSize,
          offset: (page - 1) * pageSize,
          with: { sets: true, routine: true },
        });
        const totalRows = await db
          .select({ value: count() })
          .from(workouts)
          .where(eq(workouts.userId, authUser!.id));
        const total = totalRows[0]?.value ?? 0;
        return { workouts: rows, page, pageSize, total };
      },
      {
        query: t.Object({
          page: t.Optional(t.Integer({ minimum: 1 })),
          pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
        }),
      },
    )

    .get(
      "/:id",
      async ({ authUser, params, set }) => {
        const workout = await db.query.workouts.findFirst({
          where: and(eq(workouts.id, params.id), eq(workouts.userId, authUser!.id)),
          with: {
            routine: true,
            sets: {
              orderBy: (s, { asc }) => [asc(s.exerciseId), asc(s.setNumber)],
              with: { exercise: true },
            },
          },
        });
        if (!workout) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Treino nao encontrado.");
        }
        return { workout };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // Finalizar / editar notas.
    .patch(
      "/:id",
      async ({ authUser, params, body, set }) => {
        const existing = await db.query.workouts.findFirst({
          where: and(eq(workouts.id, params.id), eq(workouts.userId, authUser!.id)),
        });
        if (!existing) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Treino nao encontrado.");
        }
        const patch: Record<string, unknown> = {};
        if (body.finishedAt !== undefined) patch.finishedAt = new Date(body.finishedAt);
        else if (existing.finishedAt === null) patch.finishedAt = new Date();
        if (body.notes !== undefined) patch.notes = body.notes;

        const [workout] = await db
          .update(workouts)
          .set(patch)
          .where(eq(workouts.id, params.id))
          .returning();
        return { workout };
      },
      { params: t.Object({ id: t.String() }), body: FinishWorkoutInput },
    )

    // Loga uma serie dentro do treino ao vivo.
    .post(
      "/:id/sets",
      async ({ authUser, params, body, set }) => {
        const workout = await db.query.workouts.findFirst({
          where: and(eq(workouts.id, params.id), eq(workouts.userId, authUser!.id)),
        });
        if (!workout) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Treino nao encontrado.");
        }
        const [created] = await db
          .insert(workoutSets)
          .values({
            workoutId: params.id,
            exerciseId: body.exerciseId,
            setNumber: body.setNumber,
            reps: body.reps,
            weight: body.weight,
            rpe: body.rpe ?? null,
            completed: body.completed ?? true,
          })
          .returning();
        set.status = 201;
        return { set: created };
      },
      { params: t.Object({ id: t.String() }), body: LogSetInput },
    );
}
