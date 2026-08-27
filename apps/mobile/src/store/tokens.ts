import * as SecureStore from "expo-secure-store";

// Tokens ficam no secure-store (Keychain/Keystore), nunca em texto plano.
const ACCESS_KEY = "gymapp.access";
const REFRESH_KEY = "gymapp.refresh";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
}

export async function getTokens(): Promise<Tokens | null> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
