import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Card, EmptyState, Divider, ErrorText } from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";
import { useBodyMetrics, useAddBodyMetric } from "../../src/api/hooks";
import { apiFetch } from "../../src/api/client";
import { GOALS, GOAL_LABELS, type Goal } from "@gymapp/shared";
import { colors } from "../../src/theme/colors";

export default function Perfil() {
  const { user, logout, refreshMe } = useAuth();

  if (!user) {
    return (
      <Screen title="Perfil">
        <EmptyState
          title="Entra ou cria conta"
          body="Sua meta, teu peso e teu histórico ficam salvos e sincronizados."
        >
          <View className="w-full gap-3">
            <Button label="Criar conta grátis" onPress={() => router.push("/register")} />
            <Button label="Já tenho conta" onPress={() => router.push("/login")} variant="ghost" />
          </View>
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen title={user.name} subtitle={user.email}>
      <GoalPicker current={user.goal} onChanged={refreshMe} />
      <Divider />
      <BodyMetricsSection />
      <Divider />
      <Button label="Sair da conta" onPress={logout} variant="danger" />
    </Screen>
  );
}

function GoalPicker({ current, onChanged }: { current: Goal; onChanged: () => Promise<void> }) {
  const [saving, setSaving] = useState<Goal | null>(null);

  async function pick(goal: Goal) {
    if (goal === current) return;
    setSaving(goal);
    try {
      await apiFetch("/auth/me", { method: "PATCH", body: { goal } });
      await onChanged();
    } finally {
      setSaving(null);
    }
  }

  return (
    <View>
      <Text className="text-chalk-muted text-sm font-semibold uppercase tracking-wide mb-3">
        Sua meta
      </Text>
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
              className={`flex-1 py-4 rounded-xl items-center border ${
                active ? "bg-volt border-volt" : "bg-ink-900 border-ink-800 active:bg-ink-800"
              }`}
            >
              <Text className={`font-bold ${active ? "text-volt-on" : "text-chalk"}`}>
                {GOAL_LABELS[g]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BodyMetricsSection() {
  const { data: metrics } = useBodyMetrics();
  const add = useAddBodyMetric();
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const w = parseFloat(weight.replace(",", "."));
    if (!w || w < 20) {
      setError("Coloca um peso válido (kg).");
      return;
    }
    setError(null);
    try {
      await add.mutateAsync({ weightKg: w });
      setWeight("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não deu pra salvar.");
    }
  }

  const last = metrics?.[0];

  return (
    <View>
      <Text className="text-chalk-muted text-sm font-semibold uppercase tracking-wide mb-3">
        Peso corporal
      </Text>
      <Card>
        <View className="flex-row items-end gap-3">
          <View className="flex-1">
            <Text className="text-chalk-faint text-xs mb-1">Peso de hoje</Text>
            <View className="bg-ink-800 border border-ink-700 rounded-xl px-3 py-2 flex-row items-baseline">
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder={last ? String(last.weightKg) : "0"}
                placeholderTextColor={colors.chalkFaint}
                accessibilityLabel="Peso corporal em kg"
                className="text-chalk text-2xl font-bold flex-1 p-0"
                style={{ color: colors.chalk }}
              />
              <Text className="text-chalk-faint text-xs ml-1">kg</Text>
            </View>
          </View>
          <View className="w-28">
            <Button label="Registrar" onPress={save} loading={add.isPending} />
          </View>
        </View>
        <ErrorText message={error} />
      </Card>

      {metrics && metrics.length > 0 ? (
        <View className="mt-3 gap-2">
          {metrics.slice(0, 5).map((m) => (
            <View key={m.id} className="flex-row justify-between px-1 py-2 border-b border-ink-900">
              <Text className="text-chalk-muted">
                {new Date(m.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </Text>
              <Text className="text-chalk font-bold">{m.weightKg} kg</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-chalk-faint text-sm mt-3">
          Registra teu peso pra acompanhar junto com a carga.
        </Text>
      )}
    </View>
  );
}
