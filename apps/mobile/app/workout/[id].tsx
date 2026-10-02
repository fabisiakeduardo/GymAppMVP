import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWorkout } from "../../src/api/hooks";
import { SkeletonRows } from "../../src/components/ui";
import { colors } from "../../src/theme/colors";
import type { Workout, WorkoutSet } from "../../src/api/types";

function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")}t`;
  return `${Math.round(kg)} kg`;
}

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workout, isLoading } = useWorkout(id!);

  const byExercise = useMemo(() => {
    const map = new Map<string, { name: string; sets: WorkoutSet[] }>();
    for (const s of workout?.sets ?? []) {
      const name = s.exercise?.name ?? "Exercício";
      const entry = map.get(s.exerciseId) ?? { name, sets: [] };
      entry.sets.push(s);
      map.set(s.exerciseId, entry);
    }
    return [...map.values()];
  }, [workout]);

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityLabel="Voltar" className="w-11 h-11 justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-xl font-extrabold flex-1">
          {workout?.routine?.name ?? "Treino"}
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10">
        {isLoading ? (
          <SkeletonRows count={5} />
        ) : workout ? (
          <>
            <Text className="text-chalk-muted">
              {new Date(workout.startedAt).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {" · "}
              {new Date(workout.startedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>

            <SummaryStrip workout={workout} />
            {byExercise.map((ex, i) => (
              <View key={i} className="mb-6">
                <Text className="text-chalk text-lg font-bold tracking-tight mb-1">{ex.name}</Text>
                {ex.sets
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((s, index) => (
                    <View
                      key={s.id}
                      className={`flex-row items-center justify-between py-3 ${
                        index === ex.sets.length - 1 ? "" : "border-b border-ink-850"
                      }`}
                    >
                      <Text className="text-chalk-faint font-semibold w-14 text-sm">
                        Série {s.setNumber}
                      </Text>
                      <Text className="text-chalk font-bold" style={{ fontVariant: ["tabular-nums"] }}>
                        {s.weight} kg × {s.reps}
                      </Text>
                      {s.completed ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.volt} />
                      ) : (
                        <Text className="text-chalk-faint text-xs">não concluída</Text>
                      )}
                    </View>
                  ))}
              </View>
            ))}
            {workout.notes ? (
              <View className="bg-ink-900 border border-ink-800 rounded-2xl p-4">
                <Text className="text-chalk-faint text-xs mb-1">Notas</Text>
                <Text className="text-chalk">{workout.notes}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text className="text-chalk-muted">Treino não encontrado.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Resumo do treino: duracao, series concluidas e volume total.
function SummaryStrip({ workout }: { workout: Workout }) {
  const mins = workout.finishedAt
    ? Math.round(
        (new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()) / 60000,
      )
    : null;
  const doneSets = workout.sets.filter((s) => s.completed).length;
  const vol = workout.sets.reduce((acc, s) => acc + (s.completed ? s.weight * s.reps : 0), 0);

  const items = [
    { label: "Duração", value: mins !== null ? `${mins} min` : "—" },
    { label: "Séries", value: String(doneSets) },
    { label: "Volume", value: vol > 0 ? fmtVolume(vol) : "—" },
  ];

  return (
    <View className="flex-row bg-ink-900 border border-ink-800 rounded-2xl my-5">
      {items.map((it, i) => (
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
  );
}
