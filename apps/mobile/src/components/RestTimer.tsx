import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { formatClock } from "../live/model";

// Cronometro de descanso: dispara ao completar uma serie, conta pra baixo e
// vibra quando zera ("bora, proxima serie"). Da pra +15s ou pular.
export function useRestTimer(defaultSeconds: number) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const target = useRef(defaultSeconds);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    setRunning(false);
    setRemaining(0);
  }, []);

  const start = useCallback((seconds?: number) => {
    target.current = seconds ?? target.current;
    setRemaining(target.current);
    setRunning(true);
  }, []);

  const addTime = useCallback((seconds: number) => {
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

  return { remaining, running, start, stop, addTime };
}

interface RestTimerBarProps {
  remaining: number;
  onAdd: () => void;
  onSkip: () => void;
}

// Barra fixa no rodape durante o descanso. Nao rouba a tela do treino.
export function RestTimerBar({ remaining, onAdd, onSkip }: RestTimerBarProps) {
  return (
    <View className="absolute left-0 right-0 bottom-0 bg-ink-800 border-t border-ink-700 px-5 py-4 flex-row items-center justify-between">
      <View>
        <Text className="text-chalk-muted text-xs uppercase tracking-wide font-semibold">
          Descanso
        </Text>
        <Text className="text-volt text-3xl font-extrabold tabular-nums">
          {formatClock(remaining)}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Somar 15 segundos ao descanso"
          className="bg-ink-700 rounded-xl px-4 min-h-[48px] items-center justify-center active:bg-ink-600"
        >
          <Text className="text-chalk font-bold">+15s</Text>
        </Pressable>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Pular descanso"
          className="bg-ink-700 rounded-xl px-4 min-h-[48px] items-center justify-center active:bg-ink-600"
        >
          <Text className="text-chalk font-bold">Pular</Text>
        </Pressable>
      </View>
    </View>
  );
}
