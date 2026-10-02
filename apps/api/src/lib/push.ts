import { eq } from "drizzle-orm";
import { pushTokens, type Database } from "@gymapp/db";

// ---------------------------------------------------------------------------
// Push notifications via Expo Push Service.
// Sem SDK — POST direto pra https://exp.host. Fire-and-forget: falha nunca
// pode quebrar a request que gerou a notificacao.
// ---------------------------------------------------------------------------

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Envia push pra todos os devices registrados do usuario.
export async function sendPush(db: Database, userId: string, msg: PushMessage) {
  try {
    const rows = await db.query.pushTokens.findMany({
      where: eq(pushTokens.userId, userId),
      columns: { token: true },
    });
    if (rows.length === 0) return;

    // So tokens do Expo sao validos nesse endpoint.
    const to = rows.map((r) => r.token).filter((tok) => tok.startsWith("ExponentPushToken"));
    if (to.length === 0) return;

    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(
        to.map((token) => ({
          to: token,
          sound: "default",
          title: msg.title,
          body: msg.body,
          data: msg.data,
        })),
      ),
    });
  } catch {
    // Push e best-effort — a notificacao in-app ja foi gravada.
  }
}
