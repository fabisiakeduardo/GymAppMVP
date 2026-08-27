import { Elysia } from "elysia";
import { eq, desc } from "drizzle-orm";
import { bodyMetrics, type Database } from "@gymapp/db";
import { CreateBodyMetricInput } from "@gymapp/shared";
import { authService } from "../plugins/auth";

export function bodyMetricRoutes(db: Database) {
  return new Elysia({ prefix: "/body-metrics" })
    .use(authService(db))
    .guard({ requireAuth: true })

    .get("/", async ({ authUser }) => {
      const metrics = await db.query.bodyMetrics.findMany({
        where: eq(bodyMetrics.userId, authUser!.id),
        orderBy: [desc(bodyMetrics.date)],
      });
      return { metrics };
    })

    .post(
      "/",
      async ({ authUser, body, set }) => {
        const [metric] = await db
          .insert(bodyMetrics)
          .values({
            userId: authUser!.id,
            date: body.date ?? new Date().toISOString().slice(0, 10),
            weightKg: body.weightKg,
            bodyFat: body.bodyFat ?? null,
            measurements: body.measurements ?? {},
            photoUrl: body.photoUrl ?? null,
          })
          .returning();
        set.status = 201;
        return { metric };
      },
      { body: CreateBodyMetricInput },
    );
}
