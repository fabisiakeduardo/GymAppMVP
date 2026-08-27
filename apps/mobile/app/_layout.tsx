import "../global.css";
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/store/auth";
import { LiveWorkoutProvider } from "../src/store/liveWorkout";
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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ink950 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LiveWorkoutProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.ink950 },
                  animation: "slide_from_right",
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="workout/live" options={{ animation: "slide_from_bottom" }} />
                <Stack.Screen name="login" options={{ presentation: "modal" }} />
                <Stack.Screen name="register" options={{ presentation: "modal" }} />
              </Stack>
            </LiveWorkoutProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
