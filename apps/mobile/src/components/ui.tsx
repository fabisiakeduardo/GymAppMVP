import React from "react";
import { View, Text, Pressable } from "react-native";

export function Card({
  children,
  onPress,
  className = "",
}: {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
}) {
  const cls = `bg-ink-900 border border-ink-800 rounded-2xl p-4 ${className}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${cls} active:bg-ink-800`}>
        {children}
      </Pressable>
    );
  }
  return <View className={cls}>{children}</View>;
}

// Estado vazio que vende o proximo passo — nunca uma tela morta.
export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center py-16 px-6">
      <Text className="text-chalk text-xl font-bold text-center">{title}</Text>
      <Text className="text-chalk-muted text-base text-center mt-2 mb-6 leading-6">{body}</Text>
      {children}
    </View>
  );
}

export function Pill({ text }: { text: string }) {
  return (
    <View className="bg-ink-800 rounded-full px-3 py-1 self-start">
      <Text className="text-chalk-muted text-xs font-semibold uppercase tracking-wide">{text}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text className="text-blood text-sm mt-2" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

export function Divider() {
  return <View className="h-px bg-ink-800 my-4" />;
}
