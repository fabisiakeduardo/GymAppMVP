import AsyncStorage from "@react-native-async-storage/async-storage";

// Preferencias locais (nao valem criar conta/servidor): descanso padrao
// do cronometro entre series. O treino ao vivo le isso ao iniciar.
const REST_KEY = "gymapp.prefs.defaultRestSeconds";

export const REST_PRESET_OPTIONS = [60, 90, 120, 180] as const;
export const DEFAULT_REST_SECONDS = 90;

export async function getDefaultRestSeconds(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(REST_KEY);
    const v = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(v) && v >= 15 && v <= 600 ? v : DEFAULT_REST_SECONDS;
  } catch {
    return DEFAULT_REST_SECONDS;
  }
}

export async function setDefaultRestSeconds(seconds: number): Promise<void> {
  try {
    await AsyncStorage.setItem(REST_KEY, String(seconds));
  } catch {
    // preferencia local; falha nao e fatal
  }
}
