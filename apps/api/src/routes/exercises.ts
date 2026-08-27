import { Elysia, t } from "elysia";
import { eq, or, isNull } from "drizzle-orm";
import { exercises, type Database } from "@gymapp/db";
import { CreateExerciseInput, UpdateExerciseInput } from "@gymapp/shared";
import { authService } from "../plugins/auth";
import { errorBody } from "../lib/errors";

export function exerciseRoutes(db: Database) {
  return new Elysia({ prefix: "/exercises" })
    .use(authService(db))
    .guard({ requireAuth: true })

    // Globais (owner null) + custom do proprio user.
    .get("/", async ({ authUser }) => {
      const list = await db.query.exercises.findMany({
        where: or(isNull(exercises.ownerId), eq(exercises.ownerId, authUser!.id)),
        orderBy: (e, { asc }) => [asc(e.name)],
      });
      return { exercises: list };
    })

    .post(
      "/",
      async ({ authUser, body, set }) => {
        const [created] = await db
          .insert(exercises)
          .values({
            name: body.name,
            muscleGroup: body.muscleGroup,
            equipment: body.equipment,
            isCustom: true,
            ownerId: authUser!.id,
          })
          .returning();
        set.status = 201;
        return { exercise: created };
      },
      { body: CreateExerciseInput },
    )

    .patch(
      "/:id",
      async ({ authUser, params, body, set }) => {
        const ex = await db.query.exercises.findFirst({
          where: eq(exercises.id, params.id),
        });
        if (!ex) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Exercicio nao encontrado.");
        }
        if (ex.ownerId === null) {
          set.status = 403;
          return errorBody("READ_ONLY", "Exercicio global nao pode ser editado.");
        }
        if (ex.ownerId !== authUser!.id) {
          set.status = 403;
          return errorBody("FORBIDDEN", "Isso nao e seu.");
        }
        const [updated] = await db
          .update(exercises)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(exercises.id, params.id))
          .returning();
        return { exercise: updated };
      },
      { params: t.Object({ id: t.String() }), body: UpdateExerciseInput },
    )

    .delete(
      "/:id",
      async ({ authUser, params, set }) => {
        const ex = await db.query.exercises.findFirst({
          where: eq(exercises.id, params.id),
        });
        if (!ex) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Exercicio nao encontrado.");
        }
        if (ex.ownerId === null) {
          set.status = 403;
          return errorBody("READ_ONLY", "Exercicio global nao pode ser removido.");
        }
        if (ex.ownerId !== authUser!.id) {
          set.status = 403;
          return errorBody("FORBIDDEN", "Isso nao e seu.");
        }
        await db.delete(exercises).where(eq(exercises.id, params.id));
        return { ok: true };
      },
      { params: t.Object({ id: t.String() }) },
    );
}
