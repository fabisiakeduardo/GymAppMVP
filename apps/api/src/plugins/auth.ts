import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { users, type Database, type User } from "@gymapp/db";
import { env } from "../env";
import { errorBody } from "../lib/errors";

// Servico de auth reutilizavel: registra o plugin JWT, resolve o usuario do
// header Bearer (authUser = User | null) e expoe o macro `requireAuth`.
export function authService(db: Database) {
  return new Elysia({ name: "auth-service" })
    .use(
      jwt({
        name: "jwt",
        secret: env.jwtSecret,
        exp: env.accessTokenTtl,
      }),
    )
    .derive({ as: "scoped" }, async ({ jwt, headers }) => {
      const header = headers.authorization;
      const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
      if (!token) return { authUser: null as User | null };

      const payload = await jwt.verify(token);
      if (!payload || typeof payload.sub !== "string") {
        return { authUser: null as User | null };
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.sub),
      });
      return { authUser: (user ?? null) as User | null };
    })
    .macro({
      requireAuth(enabled: boolean) {
        if (!enabled) return {};
        return {
          beforeHandle({ authUser, set }) {
            if (!authUser) {
              set.status = 401;
              return errorBody("UNAUTHORIZED", "Faca login pra continuar.");
            }
          },
        };
      },
    });
}
