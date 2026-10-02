import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { estimate1RM } from "@gymapp/shared/logic";
import { Button } from "../../src/components/Button";
import { EmptyState, Row, SectionTitle } from "../../src/components/ui";
import { useLiveWorkout } from "../../src/store/liveWorkout";
import { useWorkoutHistory } from "../../src/api/hooks";
import { formatClock } from "../../src/live/model";
import { colors } from "../../src/theme/colors";

// Formata volume: 12345 -> "12,3t"; 850 -> "850 kg".
function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")}t`;
  return `${Math.round(kg)} kg`;
}

// Tela de conclusao: o momento de recompensa. Le o resumo que o store
// guardou ao encerrar (lastFinished) e marca PRs comparando com o historico.
export default function WorkoutDone() {
  const { lastFinished } = useLiveWorkout();
  const { data: history } = useWorkoutHistory();

  // Melhor e1RM anterior por exercicio (exclui o treino que acabou de subir).
  const prevBest = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of history?.workouts ?? []) {
      if (lastFinished?.workoutId && w.id === lastFinished.workoutId) continue;
      for (const s of w.sets) {
        if (!s.completed) continue;
        const e = estimate1RM(s.weight, s.reps);
        if (e > (map.get(s.exerciseId) ?? 0)) map.set(s.exerciseId, e);
      }
    }
    return map;
  }, [history, lastFinished]);

  if (!lastFinished) {
    return (
      <SafeAreaView className="flex-1 bg-ink-950">
        <EmptyState title="Treino encerrado" body="Seu histórico já está atualizado.">
          <Button label="Ver histórico" onPress={() => router.replace("/(tabs)/historico")} />
        </EmptyState>
      </SafeAreaView>
    );
  }

  const durationSec = Math.max(
    0,
    Math.floor(
      (new Date(lastFinished.finishedAt).getTime() - new Date(lastFinished.startedAt).getTime()) /
        1000,
    ),
  );
  const newPrs = lastFinished.exercises.filter(
    (e) => e.bestE1RM > 0 && e.bestE1RM > (prevBest.get(e.exerciseId) ?? 0) && prevBest.has(e.exerciseId),
  );

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <ScrollView contentContainerClassName="px-5 pt-8 pb-10">
        <Text className="text-volt text-sm font-bold">Treino concluído</Text>
        <Text className="text-chalk text-4xl font-extrabold tracking-tighter mt-1">
          {formatClock(durationSec)}
        </Text>

        <View className="flex-row bg-ink-900 border border-ink-800 rounded-2xl mt-5">
          {[
            { label: "Séries", value: String(lastFinished.setsDone) },
            { label: "Volume", value: fmtVolume(lastFinished.volumeKg) },
            { label: "Exercícios", value: String(lastFinished.exercises.length) },
          ].map((it, i) => (
            <View
              key={it.label}
              className={`flex-1 py-3 items-center ${i > 0 ? "border-l border-ink-800" : ""}`}
            >
              <Text
                className="text-chalk text-lg font-extrabold tracking-tight"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {it.value}
              </Text>
              <Text className="text-chalk-faint text-[11px] mt-0.5">{it.label}</Text>
            </View>
          ))}
        </View>

        {newPrs.length > 0 ? (
          <View className="mt-6 bg-volt-wash border border-volt/40 rounded-2xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="trophy" size={18} color={colors.volt} />
              <Text className="text-volt font-bold">
                {newPrs.length === 1 ? "Novo recorde" : `${newPrs.length} novos recordes`}
              </Text>
            </View>
            {newPrs.map((e) => (
              <Text key={e.exerciseId} className="text-chalk text-[15px] py-0.5">
                {e.name} — {e.topWeight} kg × {e.topReps}
              </Text>
            ))}
          </View>
        ) : null}

        <SectionTitle>Hoje</SectionTitle>
        <View>
          {lastFinished.exercises.map((e, i) => (
            <Row
              key={e.exerciseId}
              last={i === lastFinished.exercises.length - 1}
              left={
                <View className="flex-row items-center gap-2">
                  <Text className="text-chalk font-semibold">{e.name}</Text>
                  {newPrs.some((p) => p.exerciseId === e.exerciseId) ? (
                    <Ionicons name="trophy" size={14} color={colors.volt} />
                  ) : null}
                </View>
              }
              right={
                <Text className="text-chalk-muted text-sm" style={{ fontVariant: ["tabular-nums"] }}>
                  {e.topWeight} kg × {e.topReps}
                </Text>
              }
            />
          ))}
        </View>

        <View className="mt-10">
          <Button label="Fechar" onPress={() => router.replace("/(tabs)/treinar")} large />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
