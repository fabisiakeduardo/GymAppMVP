import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getDatabaseUrl } from "./client";

// Roda as migrations SQL versionadas em ./migrations. Idempotente.
async function main() {
  const url = getDatabaseUrl();
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  console.log("Rodando migrations...");
  await migrate(db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
  console.log("Migrations aplicadas.");
  await client.end();
}

main().catch((err) => {
  console.error("Falha nas migrations:", err);
  process.exit(1);
});
