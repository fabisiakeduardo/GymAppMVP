import { createDb } from "@gymapp/db";
import { env } from "./env";
import { createApp } from "./app";

const { db } = createDb(env.databaseUrl);
const app = createApp(db).listen(env.port);

console.log(`API do GymApp on-line em http://localhost:${env.port}`);

export type { App } from "./app";
export default app;
