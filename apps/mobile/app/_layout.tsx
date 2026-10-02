// Web: gesture-handler so instala o RNGestureHandlerModule via side-effect
// import — precisa vir antes de qualquer codigo que toque gestos.
import "react-native-gesture-handler";
import "../global.css";
import React from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../src/store/auth";
import { LiveWorkoutProvider } from "../src/store/liveWorkout";
import { useRegisterPushToken } from "../src/api/hooks";
import { getExpoPushToken } from "../src/lib/notifications";
import { colors } from "../src/theme/colors";

// Online-first: TanStack cacheia leitura e reusa quando a rede oscila.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Registra o Expo push token quando o usuario loga / abre logado.
function PushRegistration() {
  const { user } = useAuth();
  const register = useRegisterPushToken();

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await getExpoPushToken();
      if (token) register.mutate({ token, platform: Platform.OS });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return null;
}

export default function RootLayout() {
  // A fonte dos icones nao carrega sozinha na web — sem isso os glifos ficam vazios.
  const [iconsLoaded] = useFonts(Ionicons.font);
  if (!iconsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ink950 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LiveWorkoutProvider>
              <StatusBar style="light" />
              <PushRegistration />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.ink950 },
                  animation: "slide_from_right",
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="workout/live" options={{ animation: "slide_from_bottom" }} />
                <Stack.Screen name="workout/done" options={{ animation: "fade", gestureEnabled: false }} />
                <Stack.Screen name="login" options={{ presentation: "modal" }} />
                <Stack.Screen name="register" options={{ presentation: "modal" }} />
                <Stack.Screen
                  name="social/compose"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
              </Stack>
            </LiveWorkoutProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
