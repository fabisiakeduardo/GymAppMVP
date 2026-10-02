import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

// Superficie elevada. Card existe pra conteudo que "sobe" do fundo —
// listas corridas usam Row/hairline (logbook), nao card empilhado.
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
      <Pressable onPress={onPress} className={`${cls} active:bg-ink-850`}>
        {children}
      </Pressable>
    );
  }
  return <View className={cls}>{children}</View>;
}

// Linha de lista em cima de hairline — o logbook. `left` e o miolo,
// `right` eh alinhado a direita.
export function Row({
  left,
  right,
  onPress,
  last = false,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const cls = `flex-row items-center justify-between py-3.5 ${last ? "" : "border-b border-ink-850"}`;
  const inner = (
    <>
      <View className="flex-1 pr-3">{left}</View>
      {right ? <View className="items-end">{right}</View> : null}
    </>
  );
  if (onPress) {
    return <Pressable onPress={onPress} className={`${cls} active:bg-ink-900 -mx-2 px-2 rounded-lg`}>{inner}</Pressable>;
  }
  return <View className={cls}>{inner}</View>;
}

// Titulo de secao — separador semantico, nao decorativo.
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between mt-6 mb-3">
      <Text className="text-chalk-faint text-[13px] font-semibold tracking-wide">{children}</Text>
      {action}
    </View>
  );
}

// Estado vazio que vende o proximo passo — nunca uma tela morta.
export function EmptyState({
  icon = "barbell-outline",
  title,
  body,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center py-16 px-6">
      <View className="w-14 h-14 rounded-2xl bg-ink-900 border border-ink-800 items-center justify-center mb-4">
        <Ionicons name={icon} size={26} color={colors.chalkFaint} />
      </View>
      <Text className="text-chalk text-xl font-bold text-center tracking-tight">{title}</Text>
      <Text className="text-chalk-muted text-[15px] text-center mt-1.5 mb-6 leading-6">{body}</Text>
      {children}
    </View>
  );
}

export function Pill({ text, active = false }: { text: string; active?: boolean }) {
  return (
    <View className={`rounded-full px-2.5 py-0.5 self-start border ${active ? "bg-volt-wash border-volt/40" : "bg-ink-850 border-ink-800"}`}>
      <Text className={`text-[11px] font-semibold ${active ? "text-volt" : "text-chalk-muted"}`}>{text}</Text>
    </View>
  );
}

// Campo de texto padrao do app: label sutil + caixa escura.
// `password` liga o olho de mostrar/esconder dentro da caixa.
export function Field({
  label,
  password,
  ...props
}: {
  label: string;
  password?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const [hidden, setHidden] = useState(true);

  if (password) {
    return (
      <View className="mb-4">
        <Text className="text-chalk-faint text-[13px] mb-1.5">{label}</Text>
        <View className="flex-row items-center bg-ink-900 border border-ink-800 rounded-xl">
          <TextInput
            placeholderTextColor={colors.chalkFaint}
            accessibilityLabel={props.accessibilityLabel ?? label}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={hidden}
            {...props}
            className="flex-1 px-4 py-3.5 text-chalk text-base"
            style={{ color: colors.chalk }}
          />
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar senha" : "Esconder senha"}
            className="px-4"
          >
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={19}
              color={colors.chalkFaint}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Text className="text-chalk-faint text-[13px] mb-1.5">{label}</Text>
      <TextInput
        placeholderTextColor={colors.chalkFaint}
        accessibilityLabel={props.accessibilityLabel ?? label}
        className="bg-ink-900 border border-ink-800 rounded-xl px-4 py-3.5 text-chalk text-base"
        style={{ color: colors.chalk }}
        {...props}
      />
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
  return <View className="h-px bg-ink-850 my-4" />;
}

// Placeholder pulsante de carregamento — mantem a tela viva em vez de
// mostrar "Carregando..." (que e ruido visual). Respeita reduce-motion?
// O pulso e sutil (opacidade 1 -> 0.45) e curto, sem mover layout.
export function Skeleton({ className, delay = 0 }: { className?: string; delay?: number }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // delay escalonado cria uma onda de cima pra baixo — parece mais rapido.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    const start = Animated.delay(delay);
    const seq = Animated.sequence([start, loop]);
    seq.start();
    return () => seq.stop();
  }, [opacity, delay]);

  return <Animated.View className={className} style={{ opacity }} />;
}

// Fileira de linhas-fantasma no formato do logbook (bloco de data + texto).
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="bg-ink-900 border border-ink-800 rounded-2xl p-4">
          <View className="flex-row items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full bg-ink-800" delay={i * 90} />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3.5 w-3/5 rounded-md bg-ink-800" delay={i * 90 + 30} />
              <Skeleton className="h-3 w-2/5 rounded-md bg-ink-800" delay={i * 90 + 60} />
            </View>
          </View>
          <Skeleton className="h-3 w-full rounded-md bg-ink-800 mt-3" delay={i * 90 + 45} />
          <Skeleton className="h-3 w-4/5 rounded-md bg-ink-800 mt-2" delay={i * 90 + 75} />
        </View>
      ))}
    </View>
  );
}
