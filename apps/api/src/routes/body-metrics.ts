import { Elysia, t } from "elysia";
import { eq, and, desc } from "drizzle-orm";
import { bodyMetrics, type Database } from "@gymapp/db";
import { CreateBodyMetricInput, UpdateBodyMetricInput, MEASUREMENT_KEYS } from "@gymapp/shared";
import { authService } from "../plugins/auth";
import { errorBody } from "../lib/errors";

// So aceita chaves conhecidas e valores validos — sem lixo no jsonb.
function cleanMeasurements(
  input?: Record<string, number | null>,
): Record<string, number> {
  if (!input) return {};
  const out: Record<string, number> = {};
  for (const key of MEASUREMENT_KEYS) {
    const v = input[key];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) out[key] = v;
  }
  return out;
}

function hasContent(metric: {
  weightKg: number | null;
  bodyFat: number | null;
  measurements: Record<string, number>;
}): boolean {
  return (
    metric.weightKg !== null ||
    metric.bodyFat !== null ||
    Object.keys(metric.measurements).length > 0
  );
}

export function bodyMetricRoutes(db: Database) {
  return new Elysia({ prefix: "/body-metrics" })
    .use(authService(db))
    .guard({ requireAuth: true })

    .get("/", async ({ authUser }) => {
      const metrics = await db.query.bodyMetrics.findMany({
        where: eq(bodyMetrics.userId, authUser!.id),
        orderBy: [desc(bodyMetrics.date), desc(bodyMetrics.createdAt)],
      });
      return { metrics };
    })

    // Upsert por data: se ja tem registro hoje, mescla em cima (peso numa hora,
    // medida em outra vira um so registro do dia).
    .post(
      "/",
      async ({ authUser, body, set }) => {
        const date = body.date ?? new Date().toISOString().slice(0, 10);
        const incoming = {
          weightKg: body.weightKg ?? null,
          bodyFat: body.bodyFat ?? null,
          measurements: cleanMeasurements(body.measurements ?? undefined),
        };
        if (!hasContent(incoming)) {
          set.status = 422;
          return errorBody("VALIDATION", "Registra peso, %gordura ou alguma medida.");
        }

        const existing = await db.query.bodyMetrics.findFirst({
          where: and(eq(bodyMetrics.userId, authUser!.id), eq(bodyMetrics.date, date)),
        });

        if (existing) {
          const [updated] = await db
            .update(bodyMetrics)
            .set({
              weightKg: incoming.weightKg ?? existing.weightKg,
              bodyFat: incoming.bodyFat ?? existing.bodyFat,
              measurements: { ...(existing.measurements ?? {}), ...incoming.measurements },
            })
            .where(eq(bodyMetrics.id, existing.id))
            .returning();
          return { metric: updated };
        }

        const [metric] = await db
          .insert(bodyMetrics)
          .values({
            userId: authUser!.id,
            date,
            weightKg: incoming.weightKg,
            bodyFat: incoming.bodyFat,
            measurements: incoming.measurements,
            photoUrl: body.photoUrl ?? null,
          })
          .returning();
        set.status = 201;
        return { metric };
      },
      { body: CreateBodyMetricInput },
    )

    .patch(
      "/:id",
      async ({ authUser, params, body, set }) => {
        const existing = await db.query.bodyMetrics.findFirst({
          where: and(eq(bodyMetrics.id, params.id), eq(bodyMetrics.userId, authUser!.id)),
        });
        if (!existing) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Registro nao encontrado.");
        }

        const patch: Record<string, unknown> = {};
        if (body.date !== undefined) patch.date = body.date;
        if (body.weightKg !== undefined) patch.weightKg = body.weightKg;
        if (body.bodyFat !== undefined) patch.bodyFat = body.bodyFat;
        if (body.measurements !== undefined) {
          patch.measurements = {
            ...(existing.measurements ?? {}),
            ...cleanMeasurements(body.measurements),
          };
        }
        if (body.photoUrl !== undefined) patch.photoUrl = body.photoUrl;

        const [metric] = await db
          .update(bodyMetrics)
          .set(patch)
          .where(eq(bodyMetrics.id, params.id))
          .returning();
        return { metric };
      },
      { params: t.Object({ id: t.String() }), body: UpdateBodyMetricInput },
    )

    .delete(
      "/:id",
      async ({ authUser, params, set }) => {
        const existing = await db.query.bodyMetrics.findFirst({
          where: and(eq(bodyMetrics.id, params.id), eq(bodyMetrics.userId, authUser!.id)),
        });
        if (!existing) {
          set.status = 404;
          return errorBody("NOT_FOUND", "Registro nao encontrado.");
        }
        await db.delete(bodyMetrics).where(eq(bodyMetrics.id, params.id));
        return { ok: true };
      },
      { params: t.Object({ id: t.String() }) },
    );
}
