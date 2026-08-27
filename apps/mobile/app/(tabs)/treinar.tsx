import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Card, EmptyState, Pill } from "../../src/components/ui";
import { useRoutines } from "../../src/api/hooks";
import { useLiveWorkout } from "../../src/store/liveWorkout";
import { workoutProgress } from "../../src/live/model";
import { colors } from "../../src/theme/colors";
import type { Routine } from "../../src/api/types";

export default function Treinar() {
  const { data: routines, isLoading } = useRoutines();
  const { workout, start } = useLiveWorkout();

  async function startFrom(routine?: Routine) {
    await start({
      id: routine?.id ?? null,
      exercises:
        routine?.exercises.map((re) => ({
          exerciseId: re.exerciseId,
          name: re.exercise.name,
          targetSets: re.targetSets,
          targetReps: re.targetReps,
          targetWeight: re.targetWeight,
        })) ?? [],
    });
    router.push("/workout/live");
  }

  return (
    <Screen title="Bora treinar" subtitle="Escolhe a rotina e vai pra cima.">
      {workout ? <InProgressBanner /> : null}

      <View className="mb-6">
        <Button label="Iniciar treino livre" onPress={() => startFrom()} large />
        <Text className="text-chalk-faint text-xs text-center mt-2">
          Sem rotina montada? Começa solto e vai adicionando.
        </Text>
      </View>

      <Text className="text-chalk-muted text-sm font-semibold uppercase tracking-wide mb-3">
        Suas rotinas
      </Text>

      {isLoading ? (
        <Text className="text-chalk-faint">Carregando...</Text>
      ) : routines && routines.length > 0 ? (
        <View className="gap-3">
          {routines.map((r) => (
            <Card key={r.id} onPress={() => startFrom(r)}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-chalk text-lg font-bold">{r.name}</Text>
                  <Text className="text-chalk-muted text-sm mt-0.5">
                    {r.exercises.length} exercício{r.exercises.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <Ionicons name="play-circle" size={34} color={colors.volt} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="Nenhuma rotina ainda"
          body="Monta a primeira e o treino vira dois toques: abre e começa."
        >
          <Button label="Montar rotina" onPress={() => router.push("/routine/new")} variant="ghost" />
        </EmptyState>
      )}

      {routines && routines.length > 0 ? (
        <Pressable onPress={() => router.push("/routine/new")} className="mt-4 py-3">
          <Text className="text-volt text-center font-semibold">+ Montar outra rotina</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function InProgressBanner() {
  const { workout } = useLiveWorkout();
  if (!workout) return null;
  const { done, total } = workoutProgress(workout);
  return (
    <Pressable onPress={() => router.push("/workout/live")} className="mb-5">
      <View className="bg-volt rounded-2xl p-4 flex-row items-center justify-between">
        <View>
          <Text className="text-volt-on font-extrabold text-lg">Treino em andamento</Text>
          <Text className="text-volt-on/80 text-sm">
            {done} de {total} séries feitas — toca pra continuar
          </Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={34} color={colors.voltOn} />
      </View>
    </Pressable>
  );
}
