import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { EmptyState, Field, ErrorText } from "../../src/components/ui";
import {
  useExercises,
  useCreateRoutine,
  useUpdateRoutine,
  useRoutine,
  type RoutineExerciseInput,
} from "../../src/api/hooks";
import { useAuth } from "../../src/store/auth";
import { colors } from "../../src/theme/colors";
import type { Exercise } from "../../src/api/types";

interface Draft extends RoutineExerciseInput {
  name: string;
}

export default function NewRoutine() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === "string" && id.length > 0;
  const { data: existing } = useRoutine(editing ? id : "");
  const { data: exercises } = useExercises();
  const create = useCreateRoutine();
  const updateMutation = useUpdateRoutine(editing ? id : "");
  const [name, setName] = useState("");
  const [items, setItems] = useState<Draft[]>([]);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Modo edicao: preenche nome e exercicios quando a rotina carrega.
  useEffect(() => {
    if (!editing || hydrated || !existing) return;
    setName(existing.name);
    setItems(
      existing.exercises.map((re, i) => ({
        exerciseId: re.exerciseId,
        name: re.exercise.name,
        order: i,
        targetSets: re.targetSets,
        targetReps: re.targetReps,
        targetWeight: re.targetWeight,
      })),
    );
    setHydrated(true);
  }, [editing, hydrated, existing]);

  const title = editing ? "Editar rotina" : "Nova rotina";

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-ink-950">
        <Header title={title} />
        <EmptyState
          title="Rotinas exigem uma conta"
          body="Crie uma conta para montar e salvar suas rotinas."
        >
          <Button label="Criar conta gratuita" onPress={() => router.replace("/register")} />
        </EmptyState>
      </SafeAreaView>
    );
  }

  function addExercise(ex: Exercise) {
    if (items.some((i) => i.exerciseId === ex.id)) return;
    setItems((prev) => [
      ...prev,
      { exerciseId: ex.id, name: ex.name, order: prev.length, targetSets: 3, targetReps: 10, targetWeight: null },
    ]);
    setPicking(false);
  }

  function update(id: string, patch: Partial<Draft>) {
    setItems((prev) => prev.map((i) => (i.exerciseId === id ? { ...i, ...patch } : i)));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.exerciseId !== id).map((i, idx) => ({ ...i, order: idx })));
  }

  async function save() {
    if (name.trim().length < 1) {
      setError("Informe um nome para a rotina.");
      return;
    }
    if (items.length === 0) {
      setError("Adicione pelo menos um exercício.");
      return;
    }
    setError(null);
    const payload = {
      name: name.trim(),
      exercises: items.map(({ name: _n, ...rest }) => rest),
    };
    try {
      if (editing) await updateMutation.mutateAsync(payload);
      else await create.mutateAsync(payload);
      router.replace("/(tabs)/treinar");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  if (picking) {
    return <InlinePicker exercises={exercises ?? []} onPick={addExercise} onCancel={() => setPicking(false)} />;
  }

  const saving = editing ? updateMutation.isPending : create.isPending;

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <Header title={title} />
      <ScrollView contentContainerClassName="px-5 pb-28">
        <Field
          label="Nome da rotina"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Peito e tríceps"
        />

        {items.length === 0 ? (
          <Text className="text-chalk-faint text-sm mb-4">
            Adicione exercícios e defina séries × repetições × carga alvo.
          </Text>
        ) : (
          <View className="gap-3 mb-4">
            {items.map((item) => (
              <View key={item.exerciseId} className="bg-ink-900 border border-ink-800 rounded-2xl p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-chalk font-bold flex-1 pr-2">{item.name}</Text>
                  <Pressable onPress={() => remove(item.exerciseId)} accessibilityLabel={`Remover ${item.name}`}>
                    <Ionicons name="close-circle" size={22} color={colors.chalkFaint} />
                  </Pressable>
                </View>
                <View className="flex-row gap-2">
                  <NumField
                    label="Séries"
                    value={item.targetSets}
                    onChange={(v) => update(item.exerciseId, { targetSets: v })}
                  />
                  <NumField
                    label="Reps"
                    value={item.targetReps}
                    onChange={(v) => update(item.exerciseId, { targetReps: v })}
                  />
                  <NumField
                    label="Carga (kg)"
                    value={item.targetWeight ?? 0}
                    onChange={(v) => update(item.exerciseId, { targetWeight: v || null })}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        <Button label="Adicionar exercício" onPress={() => setPicking(true)} variant="ghost" />
        <ErrorText message={error} />
      </ScrollView>

      <View className="absolute left-0 right-0 bottom-0 px-5 py-4 bg-ink-950 border-t border-ink-850">
        <Button label={editing ? "Salvar alterações" : "Salvar rotina"} onPress={save} loading={saving} />
      </View>
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
      <Pressable onPress={() => router.back()} accessibilityLabel="Voltar" className="w-11 h-11 justify-center">
        <Ionicons name="chevron-back" size={26} color={colors.chalk} />
      </Pressable>
      <Text className="text-chalk text-2xl font-extrabold tracking-tight flex-1">{title}</Text>
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View className="flex-1">
      <Text className="text-chalk-faint text-[13px] mb-1">{label}</Text>
      <TextInput
        value={value ? String(value) : ""}
        onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.chalkFaint}
        accessibilityLabel={label}
        className="bg-ink-850 border border-ink-800 rounded-xl px-3 py-2 text-chalk text-lg font-bold"
        style={{ color: colors.chalk, fontVariant: ["tabular-nums"] }}
      />
    </View>
  );
}

function InlinePicker({
  exercises,
  onPick,
  onCancel,
}: {
  exercises: Exercise[];
  onPick: (ex: Exercise) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(term));
  }, [exercises, q]);

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable onPress={onCancel} accessibilityLabel="Voltar" className="w-11 h-11 justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-xl font-extrabold flex-1">Escolher exercício</Text>
      </View>
      <View className="px-5 pb-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar"
          placeholderTextColor={colors.chalkFaint}
          accessibilityLabel="Buscar exercício"
          className="bg-ink-900 border border-ink-800 rounded-xl px-3 py-3 text-chalk"
          style={{ color: colors.chalk }}
        />
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10">
        <View className="gap-2">
          {filtered.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => onPick(ex)}
              className="bg-ink-900 border border-ink-800 rounded-xl p-4 flex-row items-center justify-between active:bg-ink-800"
            >
              <Text className="text-chalk font-bold">{ex.name}</Text>
              <Ionicons name="add-circle" size={24} color={colors.volt} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
