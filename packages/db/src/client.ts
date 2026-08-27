import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL nao definida. Copie .env.example pra .env ou exporte a variavel.",
    );
  }
  return url;
}

// Uma conexao por processo. `max` baixo porque o app e o gargalo, nao o banco.
export function createDb(url: string = getDatabaseUrl()) {
  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>["db"];
