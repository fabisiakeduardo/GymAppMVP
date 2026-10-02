import { Elysia } from "elysia";
import { eq, and, isNull, gt } from "drizzle-orm";
import {
  users,
  refreshTokens,
  type Database,
  type User,
} from "@gymapp/db";
import { RegisterInput, LoginInput, RefreshInput, UpdateMeInput } from "@gymapp/shared";
import { authService } from "../plugins/auth";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  ttlToSeconds,
} from "../lib/tokens";
import { rateLimit } from "../plugins/rate-limit";
import { env } from "../env";
import { errorBody } from "../lib/errors";

function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    goal: u.goal,
    heightCm: u.heightCm ?? null,
    birthDate: u.birthDate ?? null,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

function clientKey(request: Request, server: { requestIP?: (r: Request) => { address: string } | null } | null): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const ip = server?.requestIP?.(request)?.address;
  return ip ?? "local";
}

export function authRoutes(db: Database) {
  return new Elysia({ prefix: "/auth" })
    .use(authService(db))
    // Emite par de tokens e persiste o refresh (hash) rotativo.
    .decorate("issueTokens", async function issueTokens(
      jwtSign: (payload: { sub: string }) => Promise<string>,
      user: User,
    ) {
      const accessToken = await jwtSign({ sub: user.id });
      const refreshToken = generateRefreshToken();
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshExpiryDate(env.refreshTokenTtlDays),
      });
      return {
        accessToken,
        refreshToken,
        expiresIn: ttlToSeconds(env.accessTokenTtl),
      };
    })

    .post(
      "/register",
      async ({ body, jwt, issueTokens, set }) => {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, body.email.toLowerCase()),
        });
        if (existing) {
          set.status = 409;
          return errorBody("EMAIL_TAKEN", "Esse email ja tem conta.");
        }
        const [user] = await db
          .insert(users)
          .values({
            email: body.email.toLowerCase(),
            passwordHash: await hashPassword(body.password),
            name: body.name,
            goal: body.goal ?? "maintain",
          })
          .returning();

        const tokens = await issueTokens((p) => jwt.sign(p), user!);
        set.status = 201;
        return { user: publicUser(user!), ...tokens };
      },
      { body: RegisterInput },
    )

    .post(
      "/login",
      async ({ body, jwt, issueTokens, set, request, server }) => {
        const limit = rateLimit(`login:${clientKey(request, server)}`, 8, 60_000);
        if (!limit.allowed) {
          set.status = 429;
          set.headers["retry-after"] = String(limit.retryAfter);
          return errorBody("RATE_LIMITED", "Muitas tentativas. Respira e tenta em 1 min.");
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, body.email.toLowerCase()),
        });
        // Verifica sempre (mesmo sem user) pra nao vazar tempo/existencia.
        const ok = user
          ? await verifyPassword(body.password, user.passwordHash)
          : await verifyPassword(body.password, "$argon2id$v=19$m=65536,t=2,p=1$AAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

        if (!user || !ok) {
          set.status = 401;
          return errorBody("INVALID_CREDENTIALS", "Email ou senha incorretos.");
        }

        const tokens = await issueTokens((p) => jwt.sign(p), user);
        return { user: publicUser(user), ...tokens };
      },
      { body: LoginInput },
    )

    .post(
      "/refresh",
      async ({ body, jwt, issueTokens, set }) => {
        const hash = hashRefreshToken(body.refreshToken);
        const stored = await db.query.refreshTokens.findFirst({
          where: and(
            eq(refreshTokens.tokenHash, hash),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, new Date()),
          ),
        });
        if (!stored) {
          set.status = 401;
          return errorBody("INVALID_TOKEN", "Sessao expirada. Entre de novo.");
        }

        // Rotacao: revoga o antigo antes de emitir o novo.
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.id, stored.id));

        const user = await db.query.users.findFirst({
          where: eq(users.id, stored.userId),
        });
        if (!user) {
          set.status = 401;
          return errorBody("INVALID_TOKEN", "Sessao expirada. Entre de novo.");
        }

        const tokens = await issueTokens((p) => jwt.sign(p), user);
        return { user: publicUser(user), ...tokens };
      },
      { body: RefreshInput },
    )

    .post(
      "/logout",
      async ({ body }) => {
        // Best-effort: revoga o refresh enviado. Idempotente.
        const hash = hashRefreshToken(body.refreshToken);
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt)));
        return { ok: true };
      },
      { body: RefreshInput },
    )

    .get(
      "/me",
      ({ authUser }) => ({ user: publicUser(authUser!) }),
      { requireAuth: true },
    )

    // Atualiza meta, nome, altura e nascimento — usado no Perfil.
    .patch(
      "/me",
      async ({ authUser, body }) => {
        const [updated] = await db
          .update(users)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(users.id, authUser!.id))
          .returning();
        return { user: publicUser(updated!) };
      },
      { body: UpdateMeInput, requireAuth: true },
    );
}
