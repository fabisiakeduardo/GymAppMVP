import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { EmptyState, Pill, SkeletonRows } from "../../src/components/ui";
import { FadeInView, staggerDelay } from "../../src/components/anim";
import { useProfileStats, useWorkoutHistory } from "../../src/api/hooks";
import { useAuth } from "../../src/store/auth";
import { colors } from "../../src/theme/colors";
import type { ProfileStats, Workout } from "../../src/api/types";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function durationMins(startIso: string, endIso: string | null) {
  if (!endIso) return null;
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

function volume(w: Workout) {
  return w.sets.reduce((acc, s) => acc + (s.completed ? s.weight * s.reps : 0), 0);
}

// Formata volume: 12345 -> "12,3t"; 850 -> "850 kg".
function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")}t`;
  return `${Math.round(kg)} kg`;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

// Agrupa treinos por mes — o logbook.
function groupByMonth(workouts: Workout[]) {
  const groups: Array<{ label: string; items: Workout[] }> = [];
  for (const w of workouts) {
    const label = monthLabel(w.startedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(w);
    else groups.push({ label, items: [w] });
  }
  return groups;
}

export default function Historico() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useWorkoutHistory();
  const { data: stats } = useProfileStats();
  const groups = useMemo(() => groupByMonth(data?.workouts ?? []), [data]);

  if (!user) {
    return (
      <Screen title="Histórico">
        <EmptyState
          icon="person-outline"
          title="Entre para ver seu histórico"
          body="Sem uma conta, seus treinos ficam apenas neste aparelho. Crie uma conta para não perder seu progresso."
        >
          <Button label="Criar conta gratuita" onPress={() => router.push("/register")} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen title="Histórico">
      {stats ? <StatsStrip stats={stats} /> : null}

      {isLoading ? (
        <SkeletonRows count={5} />
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Sem conexão"
          body="Não foi possível carregar seus treinos. Verifique a internet e tente de novo."
        >
          <Button label="Tentar novamente" variant="ghost" onPress={() => refetch()} />
        </EmptyState>
      ) : groups.length > 0 ? (
        groups.map((g) => (
          <View key={g.label} className="mb-2">
            <Text className="text-chalk-faint text-[13px] font-semibold mt-5 mb-1 first:mt-0">
              {g.label}
            </Text>
            {g.items.map((w, i) => (
              <FadeInView key={w.id} delay={staggerDelay(i)}>
                <WorkoutRow workout={w} last={i === g.items.length - 1} />
              </FadeInView>
            ))}
          </View>
        ))
      ) : (
        <EmptyState
          icon="time-outline"
          title="Nenhum treino registrado"
          body="Seu primeiro treino aparecerá aqui assim que for concluído."
        >
          <Button label="Começar agora" onPress={() => router.push("/(tabs)/treinar")} />
        </EmptyState>
      )}
    </Screen>
  );
}

// Resumo do periodo no topo — da contexto antes da lista (estilo logbook).
function StatsStrip({ stats }: { stats: ProfileStats }) {
  const items = [
    { label: "Treinos", value: String(stats.totalWorkouts) },
    { label: "Sequência", value: stats.weeklyStreak > 0 ? `${stats.weeklyStreak} sem` : "—" },
    { label: "Volume", value: fmtVolume(stats.totalVolumeKg) },
  ];
  return (
    <View className="flex-row bg-ink-900 border border-ink-800 rounded-2xl mb-4">
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

// Linha do logbook: bloco de data (dia grande + semana) a esquerda,
// nome + detalhes no miolo, series/volume a direita.
function WorkoutRow({ workout: w, last }: { workout: Workout; last: boolean }) {
  const d = new Date(w.startedAt);
  const mins = durationMins(w.startedAt, w.finishedAt);
  const doneSets = w.sets.filter((s) => s.completed).length;
  const vol = volume(w);
  const inProgress = !w.finishedAt;

  return (
    <Pressable
      onPress={() => router.push(`/workout/${w.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${w.routine?.name ?? "Treino livre"}, ${d.toLocaleDateString("pt-BR")}`}
      className={`flex-row items-center gap-3 py-3.5 -mx-2 px-2 rounded-xl active:bg-ink-900 ${
        last ? "" : "border-b border-ink-850"
      }`}
    >
      {/* Bloco de data — a "pagina" do logbook */}
      <View
        className={`w-11 h-12 rounded-xl items-center justify-center border ${
          isToday(w.startedAt)
            ? "bg-volt-wash border-volt/40"
            : "bg-ink-900 border-ink-800"
        }`}
      >
        <Text
          className={`text-lg font-extrabold leading-5 ${isToday(w.startedAt) ? "text-volt" : "text-chalk"}`}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {d.getDate()}
        </Text>
        <Text className={`text-[10px] font-semibold ${isToday(w.startedAt) ? "text-volt/80" : "text-chalk-faint"}`}>
          {WEEKDAYS[d.getDay()]}
        </Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-chalk font-semibold text-[15px] flex-shrink" numberOfLines={1}>
            {w.routine?.name ?? "Treino livre"}
          </Text>
          {inProgress ? <Pill text="Em andamento" active /> : null}
        </View>
        <Text className="text-chalk-faint text-[13px] mt-0.5" numberOfLines={1}>
          {[mins !== null ? `${mins} min` : null, `${doneSets} séries`, vol > 0 ? fmtVolume(vol) : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.chalkFaint} />
    </Pressable>
  );
}
