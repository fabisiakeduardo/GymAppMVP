import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { Card, EmptyState, ErrorText } from "../../src/components/ui";
import { LineChart } from "../../src/components/LineChart";
import {
  useBodyMetrics,
  useAddBodyMetric,
  useUpdateBodyMetric,
  useDeleteBodyMetric,
} from "../../src/api/hooks";
import { useAuth } from "../../src/store/auth";
import { ActionSheet } from "../../src/components/ActionSheet";
import { sanitizeDecimal, parseDecimal } from "../../src/lib/masks";
import { colors } from "../../src/theme/colors";
import type { BodyMetric } from "../../src/api/types";

function fmtDay(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

// IMC = kg / m^2. So mostra se o usuario tem altura no perfil.
function bmi(weightKg: number, heightCm: number | null): string | null {
  if (!heightCm) return null;
  const m = heightCm / 100;
  return (weightKg / (m * m)).toFixed(1).replace(".", ",");
}

export default function BodyWeight() {
  const { user } = useAuth();
  const { data: metrics, isLoading } = useBodyMetrics();
  const add = useAddBodyMetric();
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BodyMetric | null>(null);

  // Pontos do grafico: so registros com peso, em ordem cronologica.
  const chartPoints = useMemo(() => {
    return (metrics ?? [])
      .filter((m) => m.weightKg !== null)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({ label: fmtDay(m.date), value: m.weightKg! }));
  }, [metrics]);

  const last = metrics?.find((m) => m.weightKg !== null);
  const prev = metrics?.filter((m) => m.weightKg !== null)[1];
  const delta = last && prev ? last.weightKg! - prev.weightKg! : null;

  async function save() {
    const w = parseDecimal(weight);
    const f = parseDecimal(fat);
    if (w === null || w < 20 || w > 500) {
      setError("Informe um peso válido em kg.");
      return;
    }
    if (f !== null && (!Number.isFinite(f) || f < 1 || f > 70)) {
      setError("% de gordura deve ficar entre 1 e 70.");
      return;
    }
    setError(null);
    try {
      await add.mutateAsync({ weightKg: w, bodyFat: f });
      setWeight("");
      setFat("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          className="w-11 h-11 justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-2xl font-extrabold tracking-tight flex-1">
          Peso corporal
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10">
        {/* Registro rapido de hoje */}
        <Card>
          <Text className="text-chalk-faint text-[13px] mb-2">Hoje</Text>
          <View className="flex-row gap-2">
            <View className="flex-1 bg-ink-850 border border-ink-800 rounded-xl px-3 py-2 flex-row items-baseline">
              <TextInput
                value={weight}
                onChangeText={(t) => setWeight(sanitizeDecimal(t, 1))}
                keyboardType="decimal-pad"
                maxLength={6}
                placeholder={last?.weightKg ? String(last.weightKg) : "0"}
                placeholderTextColor={colors.chalkFaint}
                accessibilityLabel="Peso corporal em kg"
                className="text-chalk text-2xl font-bold flex-1 p-0"
                style={{ color: colors.chalk, fontVariant: ["tabular-nums"] }}
              />
              <Text className="text-chalk-faint text-xs ml-1">kg</Text>
            </View>
            <View className="w-24 bg-ink-850 border border-ink-800 rounded-xl px-3 py-2 flex-row items-baseline">
              <TextInput
                value={fat}
                onChangeText={(t) => setFat(sanitizeDecimal(t, 1))}
                keyboardType="decimal-pad"
                maxLength={5}
                placeholder="—"
                placeholderTextColor={colors.chalkFaint}
                accessibilityLabel="Porcentagem de gordura"
                className="text-chalk text-2xl font-bold flex-1 p-0"
                style={{ color: colors.chalk, fontVariant: ["tabular-nums"] }}
              />
              <Text className="text-chalk-faint text-xs ml-1">%</Text>
            </View>
          </View>
          <Text className="text-chalk-faint text-xs mt-1.5">% gordura opcional</Text>
          <ErrorText message={error} />
          <View className="mt-3">
            <Button label="Registrar" onPress={save} loading={add.isPending} />
          </View>
        </Card>

        {/* Resumo: atual, variacao, IMC */}
        {last ? (
          <View className="flex-row gap-2 mt-3">
            <Stat label="Atual" value={`${last.weightKg} kg`} />
            <Stat
              label="Variação"
              value={
                delta === null
                  ? "—"
                  : `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} kg`
              }
              tone={delta === null || delta === 0 ? "neutral" : delta > 0 ? "up" : "down"}
            />
            <Stat label="IMC" value={last.weightKg ? (bmi(last.weightKg, user?.heightCm ?? null) ?? "—") : "—"} />
          </View>
        ) : null}

        {last && !user?.heightCm ? (
          <Pressable
            onPress={() => router.push("/profile/edit")}
            className="mt-2 flex-row items-center gap-1.5 active:opacity-70"
          >
            <Ionicons name="information-circle-outline" size={14} color={colors.chalkFaint} />
            <Text className="text-chalk-faint text-xs">
              Informe sua altura no perfil para ver o IMC.
            </Text>
          </Pressable>
        ) : null}

        {/* Grafico */}
        <View className="mt-5">
          {isLoading ? (
            <Text className="text-chalk-faint">Carregando...</Text>
          ) : chartPoints.length > 0 ? (
            <Card className="p-4">
              <LineChart
                points={chartPoints}
                emptyHint="Registre seu peso mais uma vez para ver a curva."
              />
            </Card>
          ) : null}
        </View>

        {/* Historico — segura pra editar/excluir */}
        {metrics && metrics.length > 0 ? (
          <View className="mt-6">
            <Text className="text-chalk-faint text-[13px] font-semibold mb-1">Histórico</Text>
            {metrics.map((m, i) => (
              <Pressable
                key={m.id}
                onPress={() => setEditing(m)}
                accessibilityRole="button"
                accessibilityLabel={`Registro de ${fmtDay(m.date)}`}
                accessibilityHint="Toque para editar ou excluir"
                className={`-mx-2 px-2 rounded-lg py-3 flex-row items-center justify-between active:bg-ink-900 ${
                  i === metrics.length - 1 ? "" : "border-b border-ink-850"
                }`}
              >
                <Text className="text-chalk-faint text-sm">{fmtDay(m.date)}</Text>
                <View className="flex-row items-baseline gap-3">
                  {m.bodyFat !== null ? (
                    <Text className="text-chalk-faint text-xs">{m.bodyFat}%</Text>
                  ) : null}
                  <Text
                    className="text-chalk font-bold"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {m.weightKg !== null ? `${m.weightKg} kg` : "—"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : !isLoading ? (
          <View className="mt-8">
            <EmptyState
              icon="scale-outline"
              title="Primeiro registro"
              body="Peso na balança de manhã, em jejum, é o mais consistente."
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Editor inline do registro */}
      <EditSheet metric={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "up" | "down";
}) {
  const color =
    tone === "up" ? colors.blood : tone === "down" ? colors.volt : colors.chalk;
  return (
    <View className="flex-1 bg-ink-900 border border-ink-800 rounded-2xl p-3">
      <Text className="text-chalk-faint text-[11px]">{label}</Text>
      <Text
        className="text-lg font-extrabold mt-0.5"
        style={{ color, fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

// Folha de edicao: ajusta peso/%gordura de um registro ja salvo.
function EditSheet({ metric, onClose }: { metric: BodyMetric | null; onClose: () => void }) {
  const update = useUpdateBodyMetric(metric?.id ?? "");
  const del = useDeleteBodyMetric();
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Preenche quando abre (a key muda junto com o metric).
  React.useEffect(() => {
    setWeight(metric?.weightKg !== null && metric?.weightKg !== undefined ? String(metric.weightKg) : "");
    setFat(metric?.bodyFat !== null && metric?.bodyFat !== undefined ? String(metric.bodyFat) : "");
    setError(null);
    setConfirmingDelete(false);
  }, [metric]);

  async function save() {
    const w = parseDecimal(weight);
    const f = parseDecimal(fat);
    if (w !== null && (w < 20 || w > 500)) {
      setError("Peso inválido.");
      return;
    }
    if (f !== null && (!Number.isFinite(f) || f < 1 || f > 70)) {
      setError("% de gordura inválido.");
      return;
    }
    try {
      await update.mutateAsync({ weightKg: w, bodyFat: f });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  return (
    <Modal visible={metric !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable className="bg-ink-900 border-t border-ink-800 rounded-t-3xl p-5 pb-8" onPress={() => {}}>
          <Text className="text-chalk text-lg font-bold mb-4">
            Editar {metric ? fmtDay(metric.date) : ""}
          </Text>
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1">
              <Text className="text-chalk-faint text-[13px] mb-1.5">Peso (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={(t) => setWeight(sanitizeDecimal(t, 1))}
                keyboardType="decimal-pad"
                maxLength={6}
                placeholder="—"
                placeholderTextColor={colors.chalkFaint}
                className="bg-ink-850 border border-ink-800 rounded-xl px-3 py-3 text-chalk text-lg font-bold"
                style={{ color: colors.chalk, fontVariant: ["tabular-nums"] }}
              />
            </View>
            <View className="flex-1">
              <Text className="text-chalk-faint text-[13px] mb-1.5">% gordura</Text>
              <TextInput
                value={fat}
                onChangeText={(t) => setFat(sanitizeDecimal(t, 1))}
                keyboardType="decimal-pad"
                maxLength={5}
                placeholder="—"
                placeholderTextColor={colors.chalkFaint}
                className="bg-ink-850 border border-ink-800 rounded-xl px-3 py-3 text-chalk text-lg font-bold"
                style={{ color: colors.chalk, fontVariant: ["tabular-nums"] }}
              />
            </View>
          </View>
          <ErrorText message={error} />
          <View className="gap-3 mt-3">
            <Button label="Salvar" onPress={save} loading={update.isPending} />
            <Button
              label="Excluir registro"
              variant="danger"
              onPress={() => setConfirmingDelete(true)}
            />
            <Button label="Cancelar" onPress={onClose} variant="ghost" />
          </View>
        </Pressable>
      </Pressable>

      {/* Confirmacao aninhada — mesmo padrao visual do app. */}
      <ActionSheet
        visible={confirmingDelete}
        title="Excluir registro?"
        message="O registro será removido do histórico."
        onClose={() => setConfirmingDelete(false)}
        options={[
          {
            label: "Excluir",
            destructive: true,
            onPress: () => {
              if (metric) del.mutate(metric.id);
              onClose();
            },
          },
        ]}
      />
    </Modal>
  );
}
