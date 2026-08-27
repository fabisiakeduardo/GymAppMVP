import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWorkout } from "../../src/api/hooks";
import { colors } from "../../src/theme/colors";
import type { WorkoutSet } from "../../src/api/types";

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
          <Text className="text-chalk-faint">Carregando...</Text>
        ) : workout ? (
          <>
            <Text className="text-chalk-muted mb-5">
              {new Date(workout.startedAt).toLocaleString("pt-BR")}
            </Text>
            {byExercise.map((ex, i) => (
              <View key={i} className="mb-5 bg-ink-900 border border-ink-800 rounded-2xl p-4">
                <Text className="text-chalk font-bold text-base mb-3">{ex.name}</Text>
                {ex.sets
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((s) => (
                    <View key={s.id} className="flex-row items-center justify-between py-1.5">
                      <Text className="text-chalk-faint w-10">#{s.setNumber}</Text>
                      <Text className="text-chalk font-semibold flex-1">
                        {s.weight} kg × {s.reps}
                      </Text>
                      {s.completed ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.volt} />
                      ) : (
                        <Text className="text-chalk-faint text-xs">não feita</Text>
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
