import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { workouts, workoutSets, type Database } from "@gymapp/db";
import { computePRs, computeProgression, type SetRecord } from "@gymapp/shared";
import { authService } from "../plugins/auth";

// Puxa as series completadas do usuario (data = inicio do treino).
async function userSets(db: Database, userId: string, exerciseId?: string) {
  const conditions = [eq(workouts.userId, userId)];
  if (exerciseId) conditions.push(eq(workoutSets.exerciseId, exerciseId));

  const rows = await db
    .select({
      exerciseId: workoutSets.exerciseId,
      reps: workoutSets.reps,
      weight: workoutSets.weight,
      completed: workoutSets.completed,
      startedAt: workouts.startedAt,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .where(and(...conditions));

  return rows.map<SetRecord>((r) => ({
    exerciseId: r.exerciseId,
    reps: r.reps,
    weight: r.weight,
    completed: r.completed,
    performedAt: r.startedAt,
  }));
}

export function statsRoutes(db: Database) {
  return new Elysia({ prefix: "/stats" })
    .use(authService(db))
    .guard({ requireAuth: true })

    // PRs por exercicio, com nome do exercicio pra UI.
    .get("/prs", async ({ authUser }) => {
      const sets = await userSets(db, authUser!.id);
      const prs = computePRs(sets);

      const names = new Map<string, string>();
      if (prs.length > 0) {
        const list = await db.query.exercises.findMany({
          columns: { id: true, name: true },
        });
        for (const e of list) names.set(e.id, e.name);
      }

      return {
        prs: prs
          .map((p) => ({ ...p, exerciseName: names.get(p.exerciseId) ?? "Exercicio" }))
          .sort((a, b) => b.bestE1RM - a.bestE1RM),
      };
    })

    // Serie temporal de carga/1RM/volume de um exercicio.
    .get(
      "/progression",
      async ({ authUser, query }) => {
        const sets = await userSets(db, authUser!.id, query.exerciseId);
        return { exerciseId: query.exerciseId, points: computeProgression(sets) };
      },
      { query: t.Object({ exerciseId: t.String() }) },
    );
}
