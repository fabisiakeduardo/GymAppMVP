import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { Card, EmptyState, ErrorText } from "../../src/components/ui";
import { useBodyMetrics, useAddBodyMetric } from "../../src/api/hooks";
import { MEASUREMENT_KEYS, MEASUREMENT_LABELS, type MeasurementKey } from "@gymapp/shared/constants";
import { sanitizeDecimal, parseDecimal } from "../../src/lib/masks";
import { colors } from "../../src/theme/colors";
import type { BodyMetric } from "../../src/api/types";

// Ultimo valor registrado e o penultimo (pra delta) de cada medida.
function useLatestMeasurements(metrics: BodyMetric[] | undefined) {
  return useMemo(() => {
    const map = new Map<MeasurementKey, { value: number; date: string; prev: number | null }>();
    for (const key of MEASUREMENT_KEYS) {
      const rows = (metrics ?? [])
        .filter((m) => typeof m.measurements?.[key] === "number")
        .sort((a, b) => b.date.localeCompare(a.date));
      const cur = rows[0];
      if (cur) {
        map.set(key, {
          value: cur.measurements[key]!,
          date: cur.date,
          prev: rows[1]?.measurements[key] ?? null,
        });
      }
    }
    return map;
  }, [metrics]);
}

export default function Measurements() {
  const { data: metrics, isLoading } = useBodyMetrics();
  const add = useAddBodyMetric();
  const latest = useLatestMeasurements(metrics);
  const [expanded, setExpanded] = useState<MeasurementKey | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<MeasurementKey, string>>>({});
  const [error, setError] = useState<string | null>(null);

  const filled = useMemo(
    () => MEASUREMENT_KEYS.filter((k) => (drafts[k] ?? "").trim().length > 0),
    [drafts],
  );

  async function save() {
    const measurements: Record<string, number> = {};
    for (const key of filled) {
      const v = parseDecimal(drafts[key] ?? "");
      if (v === null || v <= 0 || v > 500) {
        setError(`"${MEASUREMENT_LABELS[key]}": valor inválido. Confira o número.`);
        return;
      }
      measurements[key] = v;
    }
    if (Object.keys(measurements).length === 0) {
      setError("Preencha pelo menos uma medida em cm.");
      return;
    }
    setError(null);
    try {
      await add.mutateAsync({ measurements });
      setDrafts({});
      setExpanded(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  const hasAny = latest.size > 0;

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
          Medidas
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-32">
        {!isLoading && !hasAny ? (
          <EmptyState
            icon="resize-outline"
            title="Nenhuma medida registrada"
            body="Registre cintura, braço, coxa… em fases de cutting ou bulking, a fita métrica diz mais que a balança."
          />
        ) : null}

        <Text className="text-chalk-faint text-[13px] mb-3">
          Toque em uma medida para registrar o valor de hoje (cm).
        </Text>

        <View className="gap-2">
          {MEASUREMENT_KEYS.map((key) => {
            const cur = latest.get(key);
            const isOpen = expanded === key;
            const delta = cur?.prev !== null && cur?.prev !== undefined ? cur.value - cur.prev : null;
            return (
              <Card key={key} className="p-0 overflow-hidden">
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  className="flex-row items-center justify-between px-4 py-3.5 active:bg-ink-850"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-chalk font-semibold">{MEASUREMENT_LABELS[key]}</Text>
                    {cur ? (
                      <Text className="text-chalk-faint text-xs mt-0.5">
                        {new Date(cur.date + "T12:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {delta !== null && delta !== 0
                          ? ` · ${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} cm`
                          : ""}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    className={`font-extrabold text-lg ${cur ? "text-chalk" : "text-chalk-faint"}`}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {cur ? `${cur.value}` : "—"}
                    <Text className="text-chalk-faint text-xs font-normal"> cm</Text>
                  </Text>
                </Pressable>
                {isOpen ? (
                  <View className="px-4 pb-4 pt-1 border-t border-ink-850">
                    <View className="bg-ink-850 border border-ink-800 rounded-xl px-3 py-2 flex-row items-baseline">
                      <TextInput
                        value={drafts[key] ?? ""}
                        onChangeText={(t) =>
                          setDrafts((d) => ({ ...d, [key]: sanitizeDecimal(t, 1) }))
                        }
                        keyboardType="decimal-pad"
                        maxLength={6}
                        placeholder={cur ? String(cur.value) : "0"}
                        placeholderTextColor={colors.chalkFaint}
                        accessibilityLabel={`${MEASUREMENT_LABELS[key]} em cm`}
                        className="text-chalk text-2xl font-bold flex-1 p-0"
                        style={{ color: colors.chalk, fontVariant: ["tabular-nums"] }}
                      />
                      <Text className="text-chalk-faint text-xs ml-1">cm</Text>
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>

        <ErrorText message={error} />
      </ScrollView>

      <View className="absolute left-0 right-0 bottom-0 px-5 py-4 bg-ink-950 border-t border-ink-850">
        <Button
          label={filled.length > 0 ? `Salvar ${filled.length} medida${filled.length === 1 ? "" : "s"}` : "Preencha acima"}
          onPress={save}
          loading={add.isPending}
          disabled={filled.length === 0}
        />
      </View>
    </SafeAreaView>
  );
}
