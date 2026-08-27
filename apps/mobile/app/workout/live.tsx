import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { SetRow } from "../../src/components/SetRow";
import { RestTimerBar, useRestTimer } from "../../src/components/RestTimer";
import { EmptyState } from "../../src/components/ui";
import { useLiveWorkout } from "../../src/store/liveWorkout";
import { useWorkoutHistory } from "../../src/api/hooks";
import { lastPerformance } from "../../src/live/lastTime";
import { workoutProgress, totalVolume, formatClock } from "../../src/live/model";
import type { LiveWorkout } from "../../src/live/model";
import type { Workout } from "../../src/api/types";
import { colors } from "../../src/theme/colors";

export default function LiveWorkout() {
  const { workout, completeSet, updateSet, addExtraSet, finish } = useLiveWorkout();
  const { data: history } = useWorkoutHistory();
  const rest = useRestTimer(workout?.restSeconds ?? 90);
  const [elapsed, setElapsed] = useState(0);

  // Cronometro do treino (tempo total desde que iniciou).
  useEffect(() => {
    if (!workout) return;
    const startMs = new Date(workout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [workout?.startedAt]);

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 bg-ink-950">
        <EmptyState title="Nenhum treino rolando" body="Volta pro Treinar e começa um.">
          <Button label="Ir pro Treinar" onPress={() => router.replace("/(tabs)/treinar")} />
        </EmptyState>
      </SafeAreaView>
    );
  }

  const { done, total } = workoutProgress(workout);

  function handleComplete(exerciseId: string, setNumber: number, wasCompleted: boolean, values: { weight: number; reps: number }) {
    completeSet(exerciseId, setNumber, values);
    // So dispara o descanso ao MARCAR (nao ao desmarcar).
    if (!wasCompleted) rest.start(workout!.restSeconds);
  }

  function confirmFinish() {
    Alert.alert("Encerrar treino?", `${done} séries feitas. Bom trabalho.`, [
      { text: "Continuar treinando", style: "cancel" },
      {
        text: "Encerrar",
        style: "default",
        onPress: async () => {
          await finish();
          router.replace("/(tabs)/historico");
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="px-5 pt-2 pb-4 border-b border-ink-800 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} accessibilityLabel="Voltar" className="w-11 h-11 justify-center">
          <Ionicons name="chevron-down" size={28} color={colors.chalk} />
        </Pressable>
        <View className="items-center">
          <Text className="text-chalk text-2xl font-extrabold tabular-nums">{formatClock(elapsed)}</Text>
          <Text className="text-chalk-faint text-xs">
            {done}/{total} séries · {Math.round(totalVolume(workout))} kg de volume
          </Text>
        </View>
        <Pressable onPress={confirmFinish} accessibilityLabel="Encerrar treino" className="w-11 h-11 justify-center items-end">
          <Text className="text-volt font-bold">Fim</Text>
        </Pressable>
      </View>

      <View className="flex-1">
        <ExerciseList
          workout={workout}
          history={history?.workouts ?? []}
          onComplete={handleComplete}
          onEdit={updateSet}
          onAddSet={addExtraSet}
        />
      </View>

      {rest.running ? (
        <RestTimerBar
          remaining={rest.remaining}
          onAdd={() => rest.addTime(15)}
          onSkip={rest.stop}
        />
      ) : (
        <View className="px-5 py-3 border-t border-ink-800">
          <Button label="Encerrar treino" onPress={confirmFinish} variant="ghost" />
        </View>
      )}
    </SafeAreaView>
  );
}

function ExerciseList({
  workout,
  history,
  onComplete,
  onEdit,
  onAddSet,
}: {
  workout: LiveWorkout;
  history: Workout[];
  onComplete: (exerciseId: string, setNumber: number, wasCompleted: boolean, values: { weight: number; reps: number }) => void;
  onEdit: (exerciseId: string, setNumber: number, values: { weight?: number; reps?: number }) => void;
  onAddSet: (exerciseId: string) => void;
}) {
  if (workout.exercises.length === 0) {
    return (
      <EmptyState title="Treino livre" body="Adiciona o primeiro exercício e manda ver.">
        <Button label="Adicionar exercício" onPress={() => router.push("/exercises?pick=1")} />
      </EmptyState>
    );
  }

  return (
    <ScrollView contentContainerClassName="px-4 pt-4 pb-40">
      {workout.exercises.map((ex) => {
        const last = lastPerformance(history, ex.exerciseId);
        return (
          <View key={ex.exerciseId} className="mb-6 bg-ink-900 border border-ink-800 rounded-2xl p-3">
            <View className="flex-row items-center justify-between mb-2 px-1">
              <Text className="text-chalk text-lg font-bold flex-1 pr-2">{ex.name}</Text>
              <Text className="text-chalk-faint text-xs">
                alvo {ex.targetSets}×{ex.targetReps}
              </Text>
            </View>
            {ex.sets.map((set) => (
              <SetRow
                key={set.setNumber}
                set={set}
                lastTime={last}
                onComplete={(values) => onComplete(ex.exerciseId, set.setNumber, set.completed, values)}
                onEdit={(values) => onEdit(ex.exerciseId, set.setNumber, values)}
              />
            ))}
            <Pressable
              onPress={() => onAddSet(ex.exerciseId)}
              accessibilityLabel={`Adicionar série em ${ex.name}`}
              className="mt-2 py-3 rounded-xl bg-ink-800 active:bg-ink-700 items-center"
            >
              <Text className="text-chalk-muted font-semibold">+ Série</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable onPress={() => router.push("/exercises?pick=1")} className="py-3 items-center">
        <Text className="text-volt font-semibold">+ Adicionar exercício</Text>
      </Pressable>
    </ScrollView>
  );
}
