import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { formatClock } from "../live/model";

// Cronometro de descanso: dispara ao completar uma serie, conta pra baixo e
// vibra quando zera ("bora, proxima serie"). Presets mudam o padrao do treino.
export function useRestTimer(defaultSeconds: number) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const target = useRef(defaultSeconds);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((seconds?: number) => {
    target.current = seconds ?? target.current;
    setTotal(target.current);
    setRemaining(target.current);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    setRunning(false);
    setRemaining(0);
  }, []);

  const addTime = useCallback((seconds: number) => {
    setTotal((t) => t + seconds);
    setRemaining((r) => r + seconds);
  }, []);

  useEffect(() => {
    if (!running) return;
    interval.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (interval.current) clearInterval(interval.current);
          interval.current = null;
          setRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running]);

  return { remaining, total, running, start, stop, addTime };
}

interface RestTimerBarProps {
  remaining: number;
  total: number;
  presets?: number[]; // segundos; tocar num preset muda o descanso atual
  onPreset?: (seconds: number) => void;
  onAdd: () => void;
  onSkip: () => void;
}

// Barra fixa no rodape durante o descanso. Nao rouba a tela do treino.
export function RestTimerBar({ remaining, total, presets, onPreset, onAdd, onSkip }: RestTimerBarProps) {
  const progress = total > 0 ? remaining / total : 0;
  return (
    <View className="absolute left-0 right-0 bottom-0 bg-ink-900 border-t border-ink-800">
      {/* rastro de progresso do descanso */}
      <View className="h-0.5 bg-ink-800">
        <View
          className="h-full bg-volt"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </View>

      <View className="px-5 pt-3 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-chalk-faint text-xs font-semibold">Descanso</Text>
          <Text
            className="text-volt text-4xl font-extrabold"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatClock(remaining)}
          </Text>
        </View>
        <View className="flex-row gap-2">
          {presets?.map((s) => (
            <Pressable
              key={s}
              onPress={() => onPreset?.(s)}
              accessibilityRole="button"
              accessibilityLabel={`Descansar ${s} segundos`}
              className="bg-ink-800 border border-ink-700 rounded-xl px-3 min-h-[44px] items-center justify-center active:bg-ink-700"
            >
              <Text className="text-chalk-muted font-bold text-sm">{s}s</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Somar 15 segundos ao descanso"
            className="bg-ink-800 border border-ink-700 rounded-xl px-3 min-h-[44px] items-center justify-center active:bg-ink-700"
          >
            <Text className="text-chalk font-bold text-sm">+15</Text>
          </Pressable>
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Pular descanso"
            className="bg-chalk rounded-xl px-4 min-h-[44px] items-center justify-center active:opacity-80"
          >
            <Text className="text-ink-950 font-bold text-sm">Pular</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
