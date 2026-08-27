import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Card, EmptyState } from "../../src/components/ui";
import { useWorkoutHistory } from "../../src/api/hooks";
import { useAuth } from "../../src/store/auth";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function duration(startIso: string, endIso: string | null) {
  if (!endIso) return "em aberto";
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  return `${mins} min`;
}

export default function Historico() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useWorkoutHistory();

  if (!user) {
    return (
      <Screen title="Histórico">
        <EmptyState
          title="Seu histórico mora numa conta"
          body="Sem cadastro, o treino de hoje fica só nesse aparelho. Cria conta e nunca mais perde um PR."
        >
          <Button label="Criar conta grátis" onPress={() => router.push("/register")} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen title="Histórico" subtitle="Tudo que você já levantou.">
      {isLoading ? (
        <Text className="text-chalk-faint">Carregando...</Text>
      ) : isError ? (
        <Text className="text-chalk-muted">Sem conexão pra buscar. Puxa de novo daqui a pouco.</Text>
      ) : data && data.workouts.length > 0 ? (
        <View className="gap-3">
          {data.workouts.map((w) => (
            <Card key={w.id} onPress={() => router.push(`/workout/${w.id}`)}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-chalk text-base font-bold">
                    {w.routine?.name ?? "Treino livre"}
                  </Text>
                  <Text className="text-chalk-muted text-sm mt-0.5">{fmtDate(w.startedAt)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-volt font-bold">{w.sets.length} séries</Text>
                  <Text className="text-chalk-faint text-xs">{duration(w.startedAt, w.finishedAt)}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="Ainda sem treinos"
          body="Teu primeiro treino aparece aqui assim que você encerrar."
        >
          <Button label="Começar agora" onPress={() => router.push("/(tabs)/treinar")} />
        </EmptyState>
      )}
    </Screen>
  );
}
