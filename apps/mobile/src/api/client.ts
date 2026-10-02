import { Platform } from "react-native";
import Constants from "expo-constants";
import { getTokens, saveTokens, clearTokens } from "../store/tokens";

// Na web a API sempre esta na mesma maquina que serve o Metro — derivar do
// hostname funciona em localhost, IP de LAN e proxies. No nativo (Expo Go)
// usamos o apiUrl do app.json, que precisa ser o IP da maquina na rede.
const API_URL =
  Platform.OS === "web" && typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3333`
    : ((Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:3333");

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
    throw new ApiError(0, "OFFLINE", "Sem conexão. Verifique sua internet e tente novamente.");
  }

  if (res.status === 401 && auth && !opts._retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch<T>(path, { ...opts, _retry: true });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data?.error ?? { code: "UNKNOWN", message: "Algo deu errado. Tente novamente." };
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
