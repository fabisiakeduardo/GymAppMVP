import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { ActionSheet } from "../../src/components/ActionSheet";
import { EmptyState, SkeletonRows } from "../../src/components/ui";
import { FadeInView, PressableScale, staggerDelay } from "../../src/components/anim";
import { useRoutines, useDeleteRoutine } from "../../src/api/hooks";
import { useLiveWorkout } from "../../src/store/liveWorkout";
import { workoutProgress } from "../../src/live/model";
import { colors } from "../../src/theme/colors";
import type { Routine } from "../../src/api/types";

// Resumo dos musculos da rotina, ex: "Peito · Ombro · Triceps".
function muscleSummary(r: Routine): string {
  const seen = new Set<string>();
  for (const re of r.exercises) {
    const g = re.exercise.muscleGroup;
    if (g) seen.add(g);
  }
  return [...seen]
    .slice(0, 4)
    .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
    .join(" · ");
}

export default function Treinar() {
  const { data: routines, isLoading } = useRoutines();
  const { workout, start } = useLiveWorkout();
  const del = useDeleteRoutine();
  const [menuFor, setMenuFor] = useState<Routine | null>(null);
  const [deleting, setDeleting] = useState<Routine | null>(null);

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

  function routineActions(r: Routine) {
    setMenuFor(r);
  }


  return (
    <Screen title="Treinar">
      {workout ? <InProgressBanner /> : null}

      <View className="gap-3">
        {isLoading ? <SkeletonRows count={3} /> : null}
        {routines && routines.length > 0
          ? routines.map((r, i) => (
              <FadeInView key={r.id} delay={staggerDelay(i)}>
                <RoutineRow routine={r} last={i === routines.length - 1} onStart={() => startFrom(r)} onLongPress={() => routineActions(r)} />
              </FadeInView>
            ))
          : null}

        {!isLoading && (!routines || routines.length === 0) ? (
          <EmptyState
            icon="albums-outline"
            title="Nenhuma rotina criada"
            body="Crie sua primeira rotina para iniciar um treino com dois toques."
          >
            <Button label="Criar rotina" onPress={() => router.push("/routine/new")} />
          </EmptyState>
        ) : (
          <Pressable
            onPress={() => router.push("/routine/new")}
            accessibilityRole="button"
            className="flex-row items-center justify-between py-3.5 active:opacity-70"
          >
            <Text className="text-chalk-muted font-semibold">Nova rotina</Text>
            <Ionicons name="add" size={20} color={colors.chalkFaint} />
          </Pressable>
        )}
      </View>

      {!workout ? (
        <View className="mt-8">
          <Button label="Treino livre" onPress={() => startFrom()} large />
          <Text className="text-chalk-faint text-xs text-center mt-2.5">
            Sem rotina? Inicie um treino livre e adicione exercícios durante a sessão.
          </Text>
        </View>
      ) : null}

      {/* Menu da rotina (long-press) — Alert.alert nao funciona na web. */}
      <ActionSheet
        visible={menuFor !== null}
        title={menuFor?.name}
        onClose={() => setMenuFor(null)}
        options={
          menuFor
            ? [
                {
                  label: "Editar",
                  onPress: () => router.push(`/routine/new?id=${menuFor.id}`),
                },
                { label: "Excluir", destructive: true, onPress: () => setDeleting(menuFor) },
              ]
            : []
        }
      />

      {/* Confirmacao de excluir — mesmo padrao de sheet. */}
      <ActionSheet
        visible={deleting !== null}
        title="Excluir rotina?"
        message="Seus treinos concluídos não serão apagados."
        onClose={() => setDeleting(null)}
        options={
          deleting
            ? [{ label: "Excluir", destructive: true, onPress: () => del.mutate(deleting.id) }]
            : []
        }
      />
    </Screen>
  );
}

// Banner do treino em andamento — o unico bloco volt da tela.
function InProgressBanner() {
  const { workout } = useLiveWorkout();
  if (!workout) return null;
  const { done, total } = workoutProgress(workout);
  const pct = total > 0 ? done / total : 0;
  return (
    <Pressable
      onPress={() => router.push("/workout/live")}
      accessibilityLabel="Continuar treino em andamento"
      className="mb-6"
    >
      <View className="bg-volt rounded-2xl p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-volt-on font-extrabold text-lg tracking-tight">
              Treino em andamento
            </Text>
            <Text className="text-volt-on/70 text-sm mt-0.5">
              {done} de {total} séries concluídas
            </Text>
          </View>
          <Ionicons name="play" size={26} color={colors.voltOn} />
        </View>
        <View className="h-1 rounded-full bg-volt-on/20 mt-3 overflow-hidden">
          <View className="h-full bg-volt-on rounded-full" style={{ width: `${Math.round(pct * 100)}%` }} />
        </View>
      </View>
    </Pressable>
  );
}

// Linha de rotina: toca pra comecar, segura pra editar/excluir.
function RoutineRow({
  routine,
  last,
  onStart,
  onLongPress,
}: {
  routine: Routine;
  last: boolean;
  onStart: () => void;
  onLongPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onStart}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`Começar ${routine.name}`}
      accessibilityHint="Toque duas vezes para iniciar. Segure para editar ou excluir."
      className={`flex-row items-center justify-between py-4 active:bg-ink-900 -mx-2 px-2 rounded-xl ${
        last ? "" : "border-b border-ink-850"
      }`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-chalk text-lg font-bold tracking-tight">{routine.name}</Text>
        <Text className="text-chalk-faint text-[13px] mt-0.5">
          {routine.exercises.length} exercício{routine.exercises.length === 1 ? "" : "s"}
          {muscleSummary(routine) ? ` · ${muscleSummary(routine)}` : ""}
        </Text>
      </View>
      <View className="w-10 h-10 rounded-full bg-ink-850 border border-ink-800 items-center justify-center">
        <Ionicons name="play" size={16} color={colors.chalkMuted} />
      </View>
    </PressableScale>
  );
}
