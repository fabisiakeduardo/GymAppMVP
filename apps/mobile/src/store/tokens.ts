import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Tokens ficam no secure-store (Keychain/Keystore), nunca em texto plano.
// Na web o SecureStore nao existe — cai pro AsyncStorage (localStorage).
const ACCESS_KEY = "gymapp.access";
const REFRESH_KEY = "gymapp.refresh";
const isWeb = Platform.OS === "web";

const store = {
  set: (k: string, v: string) =>
    isWeb ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v),
  get: (k: string) =>
    isWeb ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k),
  del: (k: string) =>
    isWeb ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k),
};

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  await store.set(ACCESS_KEY, tokens.accessToken);
  await store.set(REFRESH_KEY, tokens.refreshToken);
}

export async function getTokens(): Promise<Tokens | null> {
  const accessToken = await store.get(ACCESS_KEY);
  const refreshToken = await store.get(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await store.del(ACCESS_KEY);
  await store.del(REFRESH_KEY);
}
