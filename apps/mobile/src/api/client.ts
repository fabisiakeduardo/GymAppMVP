import Constants from "expo-constants";
import { getTokens, saveTokens, clearTokens } from "../store/tokens";

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:3333";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  _retry?: boolean;
}

// Wrapper de fetch: injeta o access token, e se der 401 tenta um refresh
// rotativo uma vez antes de desistir (online-first, degrada com elegancia).
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "content-type": "application/json" };

  if (auth) {
    const tokens = await getTokens();
    if (tokens?.accessToken) headers.authorization = `Bearer ${tokens.accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "OFFLINE", "Sem conexao. Confere a internet e tenta de novo.");
  }

  if (res.status === 401 && auth && !opts._retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch<T>(path, { ...opts, _retry: true });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data?.error ?? { code: "UNKNOWN", message: "Deu ruim. Tenta de novo." };
    throw new ApiError(res.status, err.code, err.message);
  }
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens?.refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) {
      await clearTokens();
      return false;
    }
    const data = await res.json();
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

export { API_URL };
