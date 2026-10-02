import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  title?: string;
  subtitle?: string;
}

// Container padrao das telas: fundo dark, safe area, header opcional.
export function Screen({ children, scroll = true, title, subtitle }: ScreenProps) {
  const header = title ? (
    <View className="mb-5">
      <Text className="text-chalk text-[34px] leading-9 font-extrabold tracking-tighter">{title}</Text>
      {subtitle ? <Text className="text-chalk-muted text-[15px] mt-1">{subtitle}</Text> : null}
    </View>
  ) : null;

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-3 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-5 pt-3">
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
