import React from "react";
import { Pressable, Text, ActivityIndicator, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../theme/colors";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  large?: boolean;
  accessibilityHint?: string;
}

// CTA do app. `primary` usa o volt (acao principal — 1 por tela).
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  large = false,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base = large ? "py-5 px-6 rounded-2xl" : "py-3.5 px-5 rounded-xl";
  const byVariant: Record<Variant, string> = {
    primary: "bg-volt active:bg-volt-dim",
    ghost: "bg-ink-850 active:bg-ink-800 border border-ink-800",
    danger: "bg-transparent active:bg-blood/10 border border-blood/60",
  };
  const textByVariant: Record<Variant, string> = {
    primary: "text-volt-on",
    ghost: "text-chalk",
    danger: "text-blood",
  };

  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        // Feedback tatil: acao primaria "estala" na mao.
        Haptics.impactAsync(
          variant === "primary"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => {});
        onPress();
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // touch target >= 44px garantido pelo padding
      className={`${base} ${byVariant[variant]} ${isDisabled ? "opacity-50" : ""} min-h-[52px] items-center justify-center flex-row`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.voltOn : colors.chalk} />
      ) : (
        <Text
          className={`${textByVariant[variant]} text-center ${large ? "text-lg" : "text-base"} font-bold tracking-tight`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View className="gap-3">{children}</View>;
}
