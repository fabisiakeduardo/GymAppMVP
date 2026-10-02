import { sql } from "drizzle-orm";
import { createDb } from "@gymapp/db";
import { createApp } from "../src/app";
import { __resetRateLimits } from "../src/plugins/rate-limit";

const { db, client } = createDb(process.env.DATABASE_URL!);
export const app = createApp(db);
export { db, client };

// Limpa dados transacionais entre testes preservando os exercicios globais do
// seed (owner_id null). Nao usamos CASCADE em users pra nao apagar os globais.
export async function resetDb() {
  await db.execute(sql`
    TRUNCATE workout_sets, workouts, routine_exercises, routines,
             body_metrics, refresh_tokens,
             post_comments, post_likes, posts, follows, stories,
             story_views, story_likes, notifications, push_tokens RESTART IDENTITY CASCADE;
  `);
  await db.execute(sql`DELETE FROM exercises WHERE owner_id IS NOT NULL;`);
  await db.execute(sql`DELETE FROM users;`);
  __resetRateLimits();
}

interface JsonRequestInit {
  method?: string;
  body?: unknown;
  token?: string;
}

// Helper: dispara request no app e devolve { status, body }.
export async function req(path: string, init: JsonRequestInit = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
    }),
  );
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { status: res.status, body };
}

// Cria um usuario e devolve tokens + user. O @ deriva do email se nao vier.
export async function registerUser(email = "maromba@teste.com", username?: string) {
  const { body } = await req("/auth/register", {
    method: "POST",
    body: {
      email,
      // Prefixo u_ garante >=3 chars mesmo com email local curto ("a@" -> "u_a").
      username:
        username ?? `u_${email.split("@")[0]!.replace(/[^a-z0-9_.]/g, "").toLowerCase()}`.slice(0, 30),
      password: "senhaForte123",
      name: "Maromba",
      goal: "bulk",
    },
  });
  return body as {
    user: { id: string; email: string; username: string; name: string; goal: string };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
