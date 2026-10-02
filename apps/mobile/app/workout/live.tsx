import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ActionSheet } from "../../src/components/ActionSheet";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { SetRow } from "../../src/components/SetRow";
import { RestTimerBar, useRestTimer } from "../../src/components/RestTimer";
import { EmptyState } from "../../src/components/ui";
import { useLiveWorkout } from "../../src/store/liveWorkout";
import { useWorkoutHistory } from "../../src/api/hooks";
import { lastPerformance } from "../../src/live/lastTime";
import { workoutProgress, totalVolume, formatClock, pendingSets } from "../../src/live/model";
import type { LiveWorkout } from "../../src/live/model";
import type { Workout } from "../../src/api/types";
import { colors } from "../../src/theme/colors";

const REST_PRESETS = [60, 90, 120];

export default function LiveWorkoutScreen() {
  const { workout, completeSet, updateSet, addExtraSet, setRestSeconds, finish, syncing } =
    useLiveWorkout();
  const { data: history } = useWorkoutHistory();
  const rest = useRestTimer(workout?.restSeconds ?? 90);
  const [elapsed, setElapsed] = useState(0);
  const [confirming, setConfirming] = useState(false);

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
        <EmptyState title="Nenhum treino em andamento" body="Volte para a aba Treinar e inicie um treino.">
          <Button label="Ir para Treinar" onPress={() => router.replace("/(tabs)/treinar")} />
        </EmptyState>
      </SafeAreaView>
    );
  }

  const { done, total } = workoutProgress(workout);
  const pending = pendingSets(workout).length;

  function handleComplete(exerciseId: string, setNumber: number, wasCompleted: boolean, values: { weight: number; reps: number }) {
    completeSet(exerciseId, setNumber, values);
    // So dispara o descanso ao MARCAR (nao ao desmarcar).
    if (!wasCompleted) rest.start(workout!.restSeconds);
  }

  function changeRestPreset(seconds: number) {
    setRestSeconds(seconds);
    rest.start(seconds);
  }

  function confirmFinish() {
    setConfirming(true);
  }

  async function doFinish() {
    await finish();
    router.replace("/workout/done");
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      {/* Header: cronometro grande, progresso e sync status */}
      <View className="border-b border-ink-850">
        <View className="px-5 pt-1 pb-3 flex-row items-center justify-between">
          <Pressable onPress={() => router.replace("/(tabs)/treinar")} accessibilityLabel="Minimizar treino" className="w-11 h-11 justify-center">
            <Ionicons name="chevron-down" size={26} color={colors.chalk} />
          </Pressable>
          <View className="items-center">
            <Text
              className="text-chalk text-3xl font-extrabold"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formatClock(elapsed)}
            </Text>
            <Text className="text-chalk-faint text-xs mt-0.5">
              {done}/{total} séries · {Math.round(totalVolume(workout))} kg
              {pending > 0 ? ` · ${syncing ? "salvando…" : `${pending} pendente${pending === 1 ? "" : "s"}`}` : ""}
            </Text>
          </View>
          <Pressable onPress={confirmFinish} accessibilityLabel="Encerrar treino" className="w-11 h-11 justify-center items-end">
            <Text className="text-volt font-bold">Encerrar</Text>
          </Pressable>
        </View>
        {/* Barra de progresso do treino — preenche conforme as series fecham */}
        <View className="h-0.5 bg-ink-850">
          <View
            className="h-full bg-volt"
            style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }}
          />
        </View>
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
          total={rest.total}
          presets={REST_PRESETS}
          onPreset={changeRestPreset}
          onAdd={() => rest.addTime(15)}
          onSkip={rest.stop}
        />
      ) : (
        <View className="px-5 py-3 border-t border-ink-850">
          <Button label="Encerrar treino" onPress={confirmFinish} variant="ghost" />
        </View>
      )}

      {/* Confirmacao de encerrar — Alert.alert nao funciona na web. */}
      <ActionSheet
        visible={confirming}
        title="Encerrar treino?"
        message={`${done} séries concluídas.`}
        onClose={() => setConfirming(false)}
        options={[{ label: "Encerrar treino", onPress: doFinish }]}
      />
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
      <EmptyState title="Treino livre" body="Adicione o primeiro exercício para começar.">
        <Button label="Adicionar exercício" onPress={() => router.push("/exercises?pick=1")} />
      </EmptyState>
    );
  }

  // Encontra a primeira serie pendente do treino inteiro — a "fila".
  const current = findCurrent(workout);

  return (
    <ScrollView contentContainerClassName="px-4 pt-4 pb-48">
      {workout.exercises.map((ex, exIndex) => {
        const last = lastPerformance(history, ex.exerciseId);
        const doneSets = ex.sets.filter((s) => s.completed).length;
        const allDone = doneSets === ex.sets.length && ex.sets.length > 0;
        const isActive = current?.exerciseId === ex.exerciseId;
        return (
          <View
            key={ex.exerciseId}
            className={`mb-4 bg-ink-900 border rounded-2xl p-3 ${
              isActive ? "border-ink-700" : "border-ink-850"
            }`}
          >
            <View className="flex-row items-center justify-between mb-2 px-1">
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                {/* Numero do exercicio — muda pra check volt quando fecha */}
                <View
                  className={`w-7 h-7 rounded-lg items-center justify-center border ${
                    allDone
                      ? "bg-volt-wash border-volt/40"
                      : isActive
                        ? "bg-ink-850 border-ink-700"
                        : "bg-ink-850 border-ink-800"
                  }`}
                >
                  {allDone ? (
                    <Ionicons name="checkmark" size={14} color={colors.volt} />
                  ) : (
                    <Text
                      className={`text-xs font-extrabold ${isActive ? "text-volt" : "text-chalk-faint"}`}
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {exIndex + 1}
                    </Text>
                  )}
                </View>
                <Text className="text-chalk text-lg font-bold tracking-tight flex-1" numberOfLines={1}>
                  {ex.name}
                </Text>
              </View>
              <Text
                className={`text-xs font-semibold ${allDone ? "text-volt" : "text-chalk-faint"}`}
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {doneSets}/{ex.sets.length} · alvo {ex.targetSets}×{ex.targetReps}
              </Text>
            </View>
            {ex.sets.map((set) => (
              <SetRow
                key={set.setNumber}
                set={set}
                isCurrent={
                  current?.exerciseId === ex.exerciseId && current?.setNumber === set.setNumber
                }
                lastTime={last}
                onComplete={(values) => onComplete(ex.exerciseId, set.setNumber, set.completed, values)}
                onEdit={(values) => onEdit(ex.exerciseId, set.setNumber, values)}
              />
            ))}
            <Pressable
              onPress={() => onAddSet(ex.exerciseId)}
              accessibilityLabel={`Adicionar série em ${ex.name}`}
              accessibilityRole="button"
              className="mt-2 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 border border-dashed border-ink-700 active:bg-ink-850"
            >
              <Ionicons name="add" size={15} color={colors.chalkMuted} />
              <Text className="text-chalk-muted font-semibold text-sm">série</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        onPress={() => router.push("/exercises?pick=1")}
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-volt/40 active:bg-volt-wash"
      >
        <Ionicons name="add" size={18} color={colors.volt} />
        <Text className="text-volt font-semibold">Adicionar exercício</Text>
      </Pressable>
    </ScrollView>
  );
}

// Primeira serie nao feita, na ordem dos exercicios — e a "vez" do treino.
function findCurrent(workout: LiveWorkout): { exerciseId: string; setNumber: number } | null {
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      if (!set.completed) return { exerciseId: ex.exerciseId, setNumber: set.setNumber };
    }
  }
  return null;
}
