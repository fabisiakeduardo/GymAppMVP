import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { routines, routineExercises, type Database } from "@gymapp/db";
import { CreateRoutineInput, UpdateRoutineInput } from "@gymapp/shared";
import { authService } from "../plugins/auth";
import { errorBody } from "../lib/errors";

export function routineRoutes(db: Database) {
  return new Elysia({ prefix: "/routines" })
    .use(authService(db))
    .guard({ requireAuth: true })

    .get("/", async ({ authUser }) => {
      const list = await db.query.routines.findMany({
        where: eq(routines.userId, authUser!.id),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        with: {
          exercises: {
            orderBy: (re, { asc }) => [asc(re.order)],
            with: { exercise: true },
          },
        },
      });
      return { routines: list };
    })

    .get(
      "/:id",
      async ({ authUser, params, set }) => {
        const routine = await db.query.routines.findFirst({
          where: and(eq(routines.id, params.id), eq(routines.userId, authUser!.id)),
          with: {
            exercises: {
              orderBy: (re, { asc }) => [asc(re.order)],
              with: { exercise: true },
            },
          },
        });
        if (!routine) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Rotina nao encontrada.");
        }
        return { routine };
      },
      { params: t.Object({ id: t.String() }) },
    )

    .post(
      "/",
      async ({ authUser, body, set }) => {
        const routine = await db.transaction(async (tx) => {
          const [r] = await tx
            .insert(routines)
            .values({ userId: authUser!.id, name: body.name })
            .returning();
          if (body.exercises.length > 0) {
            await tx.insert(routineExercises).values(
              body.exercises.map((e) => ({
                routineId: r!.id,
                exerciseId: e.exerciseId,
                order: e.order,
                targetSets: e.targetSets,
                targetReps: e.targetReps,
                targetWeight: e.targetWeight ?? null,
              })),
            );
          }
          return r!;
        });
        set.status = 201;
        return { routine };
      },
      { body: CreateRoutineInput },
    )

    .patch(
      "/:id",
      async ({ authUser, params, body, set }) => {
        const existing = await db.query.routines.findFirst({
          where: and(eq(routines.id, params.id), eq(routines.userId, authUser!.id)),
        });
        if (!existing) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Rotina nao encontrada.");
        }
        await db.transaction(async (tx) => {
          if (body.name !== undefined) {
            await tx
              .update(routines)
              .set({ name: body.name, updatedAt: new Date() })
              .where(eq(routines.id, params.id));
          }
          // Se veio a lista de exercicios, substitui inteira (mais simples e previsivel).
          if (body.exercises !== undefined) {
            await tx.delete(routineExercises).where(eq(routineExercises.routineId, params.id));
            if (body.exercises.length > 0) {
              await tx.insert(routineExercises).values(
                body.exercises.map((e) => ({
                  routineId: params.id,
                  exerciseId: e.exerciseId,
                  order: e.order,
                  targetSets: e.targetSets,
                  targetReps: e.targetReps,
                  targetWeight: e.targetWeight ?? null,
                })),
              );
            }
          }
        });
        const routine = await db.query.routines.findFirst({
          where: eq(routines.id, params.id),
          with: {
            exercises: { orderBy: (re, { asc }) => [asc(re.order)], with: { exercise: true } },
          },
        });
        return { routine };
      },
      { params: t.Object({ id: t.String() }), body: UpdateRoutineInput },
    )

    .delete(
      "/:id",
      async ({ authUser, params, set }) => {
        const existing = await db.query.routines.findFirst({
          where: and(eq(routines.id, params.id), eq(routines.userId, authUser!.id)),
        });
        if (!existing) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Rotina nao encontrada.");
        }
        await db.delete(routines).where(eq(routines.id, params.id));
        return { ok: true };
      },
      { params: t.Object({ id: t.String() }) },
    );
}
