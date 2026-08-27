import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { EmptyState, Pill, ErrorText } from "../../src/components/ui";
import { useExercises, useCreateExercise } from "../../src/api/hooks";
import { useLiveWorkout } from "../../src/store/liveWorkout";
import { MUSCLE_GROUPS, EQUIPMENT } from "@gymapp/shared";
import { colors } from "../../src/theme/colors";
import type { Exercise } from "../../src/api/types";

export default function ExerciseLibrary() {
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const isPicking = pick === "1";
  const { data: exercises, isLoading } = useExercises();
  const { addExerciseToWorkout } = useLiveWorkout();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return exercises ?? [];
    return (exercises ?? []).filter(
      (e) => e.name.toLowerCase().includes(term) || e.muscleGroup.includes(term),
    );
  }, [exercises, q]);

  function onSelect(ex: Exercise) {
    if (isPicking) {
      addExerciseToWorkout({ exerciseId: ex.id, name: ex.name });
      router.back();
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityLabel="Voltar" className="w-11 h-11 justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-xl font-extrabold flex-1">
          {isPicking ? "Adicionar exercício" : "Exercícios"}
        </Text>
      </View>

      <View className="px-5 pb-3">
        <View className="bg-ink-900 border border-ink-800 rounded-xl px-3 flex-row items-center">
          <Ionicons name="search" size={18} color={colors.chalkFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar exercício"
            placeholderTextColor={colors.chalkFaint}
            accessibilityLabel="Buscar exercício"
            className="flex-1 text-chalk py-3 px-2"
            style={{ color: colors.chalk }}
          />
        </View>
      </View>

      {creating ? (
        <CreateCustom onDone={() => setCreating(false)} />
      ) : (
        <>
          <ScrollView contentContainerClassName="px-5 pb-24">
            {isLoading ? (
              <Text className="text-chalk-faint">Carregando...</Text>
            ) : filtered.length > 0 ? (
              <View className="gap-2">
                {filtered.map((ex) => (
                  <Pressable
                    key={ex.id}
                    onPress={() => onSelect(ex)}
                    className="bg-ink-900 border border-ink-800 rounded-xl p-4 flex-row items-center justify-between active:bg-ink-800"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-chalk font-bold text-base">{ex.name}</Text>
                      <Text className="text-chalk-faint text-xs mt-0.5 capitalize">
                        {ex.muscleGroup} · {ex.equipment.replace("_", " ")}
                      </Text>
                    </View>
                    {ex.isCustom ? <Pill text="Meu" /> : null}
                    {isPicking ? (
                      <Ionicons name="add-circle" size={26} color={colors.volt} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState
                title="Nada com esse nome"
                body="Não achou? Cria o teu — fica salvo só pra você."
              />
            )}
          </ScrollView>

          <View className="absolute left-0 right-0 bottom-0 px-5 py-4 bg-ink-950 border-t border-ink-800">
            <Button label="Criar exercício" onPress={() => setCreating(true)} variant="ghost" />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function CreateCustom({ onDone }: { onDone: () => void }) {
  const create = useCreateExercise();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<string>(MUSCLE_GROUPS[0]);
  const [equip, setEquip] = useState<string>(EQUIPMENT[0]);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (name.trim().length < 2) {
      setError("Dá um nome de pelo menos 2 letras.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim(), muscleGroup: muscle, equipment: equip });
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não deu pra criar.");
    }
  }

  return (
    <ScrollView contentContainerClassName="px-5 pb-10">
      <Text className="text-chalk-faint text-xs mb-1">Nome</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ex: Rosca 21"
        placeholderTextColor={colors.chalkFaint}
        accessibilityLabel="Nome do exercício"
        className="bg-ink-900 border border-ink-800 rounded-xl px-3 py-3 text-chalk mb-4"
        style={{ color: colors.chalk }}
      />

      <Chips label="Músculo" options={[...MUSCLE_GROUPS]} value={muscle} onChange={setMuscle} />
      <Chips label="Equipamento" options={[...EQUIPMENT]} value={equip} onChange={setEquip} />

      <ErrorText message={error} />
      <View className="gap-3 mt-4">
        <Button label="Salvar exercício" onPress={submit} loading={create.isPending} />
        <Button label="Cancelar" onPress={onDone} variant="ghost" />
      </View>
    </ScrollView>
  );
}

function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-chalk-faint text-xs mb-2">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => onChange(o)}
              accessibilityState={{ selected: active }}
              className={`px-3 py-2 rounded-full border ${
                active ? "bg-volt border-volt" : "bg-ink-900 border-ink-800"
              }`}
            >
              <Text className={`text-sm capitalize ${active ? "text-volt-on font-bold" : "text-chalk-muted"}`}>
                {o.replace("_", " ")}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
