import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Comportamento de push recebida com o app aberto: mostra banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pega o Expo push token do device (pede permissao no caminho).
// Devolve null no simulador/web ou quando o usuario nega.
export async function getExpoPushToken(): Promise<string | null> {
  // Push so existe no nativo — na web sai cedo.
  if (Platform.OS === "web") return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const res = await Notifications.requestPermissionsAsync();
    status = res.status;
  }
  if (status !== "granted") return null;

  // Android precisa do canal padrao.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return res.data;
  } catch {
    return null;
  }
}
