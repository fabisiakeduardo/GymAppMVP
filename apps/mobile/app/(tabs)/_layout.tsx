import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme/colors";

type IconName = keyof typeof Ionicons.glyphMap;

// Tab ativa: icone cheio + volt. Inativa: contorno + faint.
function tabIcon(filled: IconName, outline: IconName) {
  return function Icon({ color, focused }: { color: string; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} size={22} color={color} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.volt,
        tabBarInactiveTintColor: colors.chalkFaint,
        tabBarStyle: {
          backgroundColor: colors.ink950,
          borderTopColor: colors.ink850,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="treinar"
        options={{ title: "Treinar", tabBarIcon: tabIcon("barbell", "barbell-outline") }}
      />
      <Tabs.Screen
        name="historico"
        options={{ title: "Histórico", tabBarIcon: tabIcon("time", "time-outline") }}
      />
      <Tabs.Screen
        name="progresso"
        options={{ title: "Progresso", tabBarIcon: tabIcon("trending-up", "trending-up-outline") }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: "Perfil", tabBarIcon: tabIcon("person", "person-outline") }}
      />
    </Tabs>
  );
}
