import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import type { Database } from "@gymapp/db";
import { env } from "./env";
import { ApiError, errorBody } from "./lib/errors";
import { authRoutes } from "./routes/auth";
import { exerciseRoutes } from "./routes/exercises";
import { routineRoutes } from "./routes/routines";
import { workoutRoutes } from "./routes/workouts";
import { statsRoutes } from "./routes/stats";
import { bodyMetricRoutes } from "./routes/body-metrics";

// Fabrica do app. Recebe o db pra que os testes injetem uma conexao propria.
export function createApp(db: Database) {
  return new Elysia()
    .use(
      cors({
        origin: env.corsOrigins,
        methods: ["GET", "POST", "PATCH", "DELETE"],
        credentials: true,
      }),
    )
    // Erros consistentes: { error: { code, message } }.
    .onError(({ error, code, set }) => {
      if (error instanceof ApiError) {
        set.status = error.status;
        return errorBody(error.code, error.message);
      }
      if (code === "VALIDATION") {
        set.status = 422;
        return errorBody("VALIDATION", "Dados invalidos. Confere os campos.");
      }
      if (code === "NOT_FOUND") {
        set.status = 404;
        return errorBody("NOT_FOUND", "Rota nao encontrada.");
      }
      set.status = 500;
      if (!env.isProd) console.error(error);
      return errorBody("INTERNAL", "Deu ruim aqui. Tenta de novo.");
    })
    .get("/health", () => ({ status: "ok", ts: new Date().toISOString() }))
    .use(authRoutes(db))
    .use(exerciseRoutes(db))
    .use(routineRoutes(db))
    .use(workoutRoutes(db))
    .use(statsRoutes(db))
    .use(bodyMetricRoutes(db));
}

export type App = ReturnType<typeof createApp>;
