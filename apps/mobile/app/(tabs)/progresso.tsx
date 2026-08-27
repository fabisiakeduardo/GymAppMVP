import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Card, EmptyState, Divider } from "../../src/components/ui";
import { ProgressionChart } from "../../src/components/ProgressionChart";
import { usePRs, useProgression } from "../../src/api/hooks";
import { useAuth } from "../../src/store/auth";
import { colors } from "../../src/theme/colors";
import { Ionicons } from "@expo/vector-icons";

export default function Progresso() {
  const { user } = useAuth();
  const { data: prs, isLoading } = usePRs();
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? prs?.[0]?.exerciseId ?? null;
  const { data: points } = useProgression(activeId);
  const activePr = prs?.find((p) => p.exerciseId === activeId);

  if (!user) {
    return (
      <Screen title="Progresso">
        <EmptyState
          title="PR sem conta não existe"
          body="Cria conta pra ver teus recordes e a carga subindo treino após treino."
        >
          <Button label="Criar conta grátis" onPress={() => router.push("/register")} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen title="Progresso" subtitle="Recordes e evolução de carga.">
      {isLoading ? (
        <Text className="text-chalk-faint">Carregando...</Text>
      ) : prs && prs.length > 0 ? (
        <>
          <Card>
            <Text className="text-chalk-muted text-sm font-semibold uppercase tracking-wide mb-2">
              {activePr?.exerciseName ?? "Exercício"}
            </Text>
            <ProgressionChart points={points ?? []} />
          </Card>

          <Divider />

          <Text className="text-chalk-muted text-sm font-semibold uppercase tracking-wide mb-3">
            Seus PRs
          </Text>
          <View className="gap-3">
            {prs.map((pr) => {
              const isActive = pr.exerciseId === activeId;
              return (
                <Pressable
                  key={pr.exerciseId}
                  onPress={() => setSelected(pr.exerciseId)}
                  className={`rounded-2xl p-4 border flex-row items-center justify-between ${
                    isActive ? "bg-volt/10 border-volt" : "bg-ink-900 border-ink-800"
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <Ionicons name="trophy" size={22} color={colors.volt} />
                    <View className="flex-1">
                      <Text className="text-chalk font-bold">{pr.exerciseName}</Text>
                      <Text className="text-chalk-faint text-xs">
                        e1RM estimado {Math.round(pr.bestE1RM)} kg
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-volt text-lg font-extrabold">{pr.maxWeight} kg</Text>
                    <Text className="text-chalk-faint text-xs">× {pr.maxWeightReps}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <EmptyState
          title="Nenhum PR ainda"
          body="Loga alguns treinos e teus recordes começam a pintar aqui."
        >
          <Button label="Ir treinar" onPress={() => router.push("/(tabs)/treinar")} />
        </EmptyState>
      )}
    </Screen>
  );
}
