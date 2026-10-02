import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { EmptyState, SectionTitle } from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";
import { useBodyMetrics, useProfileStats, useUpdateMe } from "../../src/api/hooks";
import { GOALS, GOAL_LABELS, type Goal } from "@gymapp/shared/constants";
import { colors } from "../../src/theme/colors";

// Formata volume grande: 12345 kg -> "12,3t".
function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")}t`;
  return `${Math.round(kg)} kg`;
}

export default function Perfil() {
  const { user, logout, refreshMe } = useAuth();

  if (!user) {
    return (
      <Screen title="Perfil">
        <EmptyState
          icon="person-outline"
          title="Entre ou crie uma conta"
          body="Sua meta, peso e histórico ficam salvos e sincronizados."
        >
          <View className="w-full gap-3">
            <Button label="Criar conta gratuita" onPress={() => router.push("/register")} />
            <Button label="Já tenho conta" onPress={() => router.push("/login")} variant="ghost" />
          </View>
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {/* Identidade: inicial grande + nome + email + lapis de edicao */}
      <View className="flex-row items-center gap-4 mb-2">
        <Avatar uri={user.avatarUrl} name={user.name} size={64} />
        <View className="flex-1">
          <Text className="text-chalk text-2xl font-extrabold tracking-tight" numberOfLines={1}>
            {user.name}
          </Text>
          <Text className="text-chalk-faint text-sm mt-0.5" numberOfLines={1}>
            {user.email}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/profile/edit")}
          accessibilityLabel="Editar perfil"
          className="w-11 h-11 items-center justify-center rounded-xl bg-ink-900 border border-ink-800 active:bg-ink-850"
        >
          <Ionicons name="create-outline" size={18} color={colors.chalkMuted} />
        </Pressable>
      </View>

      <StatsRow />

      <SectionTitle>Seu corpo</SectionTitle>
      <BodyLinks />

      <SectionTitle>Sua meta</SectionTitle>
      <GoalPicker current={user.goal} onChanged={refreshMe} />

      <View className="mt-10">
        <Button label="Sair da conta" onPress={logout} variant="danger" />
      </View>
    </Screen>
  );
}

// Numeros do atleta — estilo Hevy: treinos, sequencia de semanas, volume.
function StatsRow() {
  const { data: stats } = useProfileStats();
  if (!stats) return null;

  const items = [
    { label: "Treinos", value: String(stats.totalWorkouts) },
    {
      label: "Sequência",
      value:
        stats.weeklyStreak > 0
          ? `${stats.weeklyStreak} sem`
          : "—",
    },
    { label: "Volume", value: fmtVolume(stats.totalVolumeKg) },
  ];

  return (
    <View className="flex-row gap-2 mt-4">
      {items.map((it) => (
        <View key={it.label} className="flex-1 bg-ink-900 border border-ink-800 rounded-2xl p-3">
          <Text className="text-chalk-faint text-[11px]">{it.label}</Text>
          <Text
            className="text-chalk text-lg font-extrabold mt-0.5"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Atalhos pras telas de corpo — mostra o ultimo peso registrado, se tiver.
function BodyLinks() {
  const { data: metrics } = useBodyMetrics();
  const lastWeight = metrics?.find((m) => m.weightKg !== null);

  const links = [
    {
      href: "/body/weight",
      icon: "scale-outline" as const,
      title: "Peso corporal",
      sub: lastWeight ? `${lastWeight.weightKg} kg` : "Registrar",
    },
    {
      href: "/body/measurements",
      icon: "resize-outline" as const,
      title: "Medidas",
      sub: "Cintura, braço, coxa...",
    },
  ];

  return (
    <View className="gap-2">
      {links.map((l) => (
        <Pressable
          key={l.href}
          onPress={() => router.push(l.href as "/body/weight" | "/body/measurements")}
          accessibilityRole="button"
          className="flex-row items-center bg-ink-900 border border-ink-800 rounded-2xl px-4 py-3.5 active:bg-ink-850"
        >
          <View className="w-9 h-9 rounded-xl bg-ink-850 border border-ink-800 items-center justify-center mr-3">
            <Ionicons name={l.icon} size={18} color={colors.chalkMuted} />
          </View>
          <View className="flex-1">
            <Text className="text-chalk font-semibold">{l.title}</Text>
            <Text className="text-chalk-faint text-xs mt-0.5">{l.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.chalkFaint} />
        </Pressable>
      ))}
    </View>
  );
}

function GoalPicker({ current, onChanged }: { current: Goal; onChanged: () => Promise<void> }) {
  const [saving, setSaving] = useState<Goal | null>(null);
  const update = useUpdateMe();

  async function pick(goal: Goal) {
    if (goal === current) return;
    setSaving(goal);
    try {
      await update.mutateAsync({ goal });
      await onChanged();
    } finally {
      setSaving(null);
    }
  }

  return (
    <View className="flex-row gap-2">
      {GOALS.map((g) => {
        const active = g === current;
        return (
          <Pressable
            key={g}
            onPress={() => pick(g)}
            disabled={saving !== null}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-1 py-3.5 rounded-xl items-center border ${
              active ? "bg-volt border-volt" : "bg-ink-900 border-ink-800 active:bg-ink-850"
            } ${saving === g ? "opacity-60" : ""}`}
          >
            <Text className={`font-bold text-sm ${active ? "text-volt-on" : "text-chalk"}`}>
              {GOAL_LABELS[g]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

