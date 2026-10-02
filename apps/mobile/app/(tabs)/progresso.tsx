import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Card, EmptyState, Row, Skeleton, SkeletonRows } from "../../src/components/ui";
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
          icon="trophy-outline"
          title="Entre para ver seus recordes"
          body="Crie uma conta para acompanhar seus recordes e a evolução das cargas."
        >
          <Button label="Criar conta gratuita" onPress={() => router.push("/register")} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen title="Progresso">
      {isLoading ? (
        <View>
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-4 w-24 mt-6 mb-1" />
          <SkeletonRows count={4} />
        </View>
      ) : prs && prs.length > 0 ? (
        <>
          <Card className="p-5">
            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="text-chalk font-bold text-base flex-1 pr-2" numberOfLines={1}>
                {activePr?.exerciseName ?? "Exercício"}
              </Text>
              {activePr ? (
                <Text
                  className="text-volt font-extrabold text-lg"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {activePr.maxWeight} kg
                </Text>
              ) : null}
            </View>
            <ProgressionChart points={points ?? []} />
          </Card>

          <Text className="text-chalk-faint text-[13px] font-semibold mt-6 mb-1">
            Recordes
          </Text>
          <View>
            {prs.map((pr, i) => {
              const isActive = pr.exerciseId === activeId;
              return (
                <Row
                  key={pr.exerciseId}
                  last={i === prs.length - 1}
                  onPress={() => setSelected(pr.exerciseId)}
                  left={
                    <View className="flex-row items-center gap-2.5">
                      <Ionicons
                        name={isActive ? "trophy" : "trophy-outline"}
                        size={18}
                        color={isActive ? colors.volt : colors.chalkFaint}
                      />
                      <View>
                        <Text className="text-chalk font-semibold text-[15px]">
                          {pr.exerciseName}
                        </Text>
                        <Text className="text-chalk-faint text-xs mt-0.5">
                          1RM estimado {Math.round(pr.bestE1RM)} kg
                        </Text>
                      </View>
                    </View>
                  }
                  right={
                    <>
                      <Text
                        className={`font-extrabold text-base ${isActive ? "text-volt" : "text-chalk"}`}
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {pr.maxWeight} kg
                      </Text>
                      <Text className="text-chalk-faint text-xs">× {pr.maxWeightReps}</Text>
                    </>
                  }
                />
              );
            })}
          </View>
        </>
      ) : (
        <EmptyState
          icon="trophy-outline"
          title="Nenhum recorde ainda"
          body="Conclua alguns treinos e seus recordes aparecerão aqui."
        >
          <Button label="Ir treinar" onPress={() => router.push("/(tabs)/treinar")} />
        </EmptyState>
      )}
    </Screen>
  );
}
