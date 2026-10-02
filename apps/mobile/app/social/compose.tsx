import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Button } from "../../src/components/Button";
import { ErrorText } from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";
import {
  useCreatePost,
  useWorkoutHistory,
  useRoutines,
  useBodyMetrics,
} from "../../src/api/hooks";
import { colors } from "../../src/theme/colors";
import type { Routine, BodyMetric } from "../../src/api/types";

type Picker = "none" | "workout" | "routine" | "metric";

// Composer livre: legenda + ate 4 fotos + anexos do logbook (treino, rotina,
// medida). Chega com ?workoutId= pra pre-anexar o treino recem-concluido.
export default function ComposePost() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ workoutId?: string }>();
  const create = useCreatePost();

  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [workoutId, setWorkoutId] = useState<string | null>(params.workoutId ?? null);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [metricId, setMetricId] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>("none");
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: history } = useWorkoutHistory();
  const { data: routines } = useRoutines();
  const { data: metrics } = useBodyMetrics();

  const workouts = (history?.workouts ?? []).filter((w) => w.finishedAt);
  const selectedWorkout = workouts.find((w) => w.id === workoutId) ?? null;
  const selectedRoutine = routines?.find((r) => r.id === routineId) ?? null;
  const selectedMetric = metrics?.find((m) => m.id === metricId) ?? null;

  async function addPhoto() {
    setPickingPhoto(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 4 - media.length,
      });
      if (res.canceled || !res.assets?.length) return;
      const next = [...media];
      for (const asset of res.assets) {
        if (next.length >= 4) break;
        const edited = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );
        if (edited.base64) next.push(`data:image/jpeg;base64,${edited.base64}`);
      }
      setMedia(next);
    } catch {
      setError("Não deu pra abrir a galeria.");
    } finally {
      setPickingPhoto(false);
    }
  }

  const hasContent =
    caption.trim().length > 0 ||
    media.length > 0 ||
    workoutId !== null ||
    routineId !== null ||
    metricId !== null;

  async function publish() {
    if (!hasContent) {
      setError("Escreve algo, adiciona uma foto ou anexa algo do logbook.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        caption: caption.trim() || undefined,
        mediaUrls: media.length ? media : undefined,
        workoutId: workoutId ?? undefined,
        routineId: routineId ?? undefined,
        bodyMetricId: metricId ?? undefined,
      });
      router.dismiss();
      router.push("/(tabs)/social");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar.");
    }
  }

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Fechar"
          className="w-11 h-11 justify-center"
        >
          <Ionicons name="close" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-2xl font-extrabold tracking-tight flex-1">
          Novo post
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Como foi o treino de hoje?"
          placeholderTextColor={colors.chalkFaint}
          multiline
          maxLength={2000}
          accessibilityLabel="Legenda do post"
          className="bg-ink-900 border border-ink-800 rounded-2xl px-4 py-4 text-chalk text-base min-h-[120px]"
          style={{ color: colors.chalk, textAlignVertical: "top" }}
        />

        {/* Fotos */}
        {media.length > 0 ? (
          <View className="flex-row flex-wrap gap-2 mt-4">
            {media.map((uri, i) => (
              <View key={i} className="relative">
                <Image
                  source={{ uri }}
                  className="w-24 h-24 rounded-xl bg-ink-850"
                  accessibilityLabel={`Foto ${i + 1}`}
                />
                <Pressable
                  onPress={() => setMedia(media.filter((_, j) => j !== i))}
                  accessibilityLabel="Remover foto"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ink-800 border border-ink-700 items-center justify-center"
                >
                  <Ionicons name="close" size={13} color={colors.chalk} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Anexos selecionados */}
        {selectedWorkout ? (
          <AttachmentChip
            icon="barbell"
            label={selectedWorkout.routine?.name ?? "Treino livre"}
            sub={`${selectedWorkout.sets.filter((s) => s.completed).length} séries concluídas`}
            onRemove={() => setWorkoutId(null)}
          />
        ) : null}
        {selectedRoutine ? (
          <AttachmentChip
            icon="list"
            label={selectedRoutine.name}
            sub="Rotina — outros vão poder salvar uma cópia"
            onRemove={() => setRoutineId(null)}
          />
        ) : null}
        {selectedMetric ? (
          <AttachmentChip
            icon="body"
            label="Progresso corporal"
            sub={new Date(`${selectedMetric.date}T00:00:00`).toLocaleDateString("pt-BR")}
            onRemove={() => setMetricId(null)}
          />
        ) : null}

        {/* Seletor de anexo */}
        {picker === "workout" ? (
          <AttachmentPicker
            title="Escolher treino"
            items={workouts.slice(0, 10).map((w) => ({
              id: w.id,
              label: w.routine?.name ?? "Treino livre",
              sub: new Date(w.startedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              }),
            }))}
            onPick={(id) => {
              setWorkoutId(id);
              setPicker("none");
            }}
            onClose={() => setPicker("none")}
          />
        ) : picker === "routine" ? (
          <AttachmentPicker
            title="Escolher rotina"
            items={(routines ?? []).map((r: Routine) => ({
              id: r.id,
              label: r.name,
              sub: `${r.exercises.length} exercícios`,
            }))}
            onPick={(id) => {
              setRoutineId(id);
              setPicker("none");
            }}
            onClose={() => setPicker("none")}
          />
        ) : picker === "metric" ? (
          <AttachmentPicker
            title="Escolher medida"
            items={(metrics ?? []).slice(0, 10).map((m: BodyMetric) => ({
              id: m.id,
              label: new Date(`${m.date}T00:00:00`).toLocaleDateString("pt-BR"),
              sub: [
                m.weightKg !== null ? `${m.weightKg} kg` : null,
                m.bodyFat !== null ? `${m.bodyFat}%` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Medidas",
            }))}
            onPick={(id) => {
              setMetricId(id);
              setPicker("none");
            }}
            onClose={() => setPicker("none")}
          />
        ) : null}

        <ErrorText message={error} />
      </ScrollView>

      {/* Barra de anexos + publicar */}
      <View className="absolute left-0 right-0 bottom-0 bg-ink-950 border-t border-ink-850 px-5 pt-3 pb-5">
        <View className="flex-row gap-2 mb-3">
          <AttachButton
            icon="image-outline"
            label="Foto"
            active={media.length > 0}
            disabled={media.length >= 4}
            loading={pickingPhoto}
            onPress={addPhoto}
          />
          <AttachButton
            icon="barbell-outline"
            label="Treino"
            active={workoutId !== null}
            onPress={() => setPicker(picker === "workout" ? "none" : "workout")}
          />
          <AttachButton
            icon="list-outline"
            label="Rotina"
            active={routineId !== null}
            onPress={() => setPicker(picker === "routine" ? "none" : "routine")}
          />
          <AttachButton
            icon="body-outline"
            label="Medidas"
            active={metricId !== null}
            onPress={() => setPicker(picker === "metric" ? "none" : "metric")}
          />
        </View>
        <Button
          label="Publicar"
          onPress={publish}
          loading={create.isPending}
          disabled={!hasContent}
        />
      </View>
    </SafeAreaView>
  );
}

// Botao da barra de anexos.
function AttachButton({
  icon,
  label,
  active,
  disabled = false,
  loading = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={`Anexar ${label}`}
      accessibilityState={{ selected: active, disabled }}
      className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border ${
        active ? "bg-volt-wash border-volt/40" : "bg-ink-900 border-ink-800 active:bg-ink-850"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <Ionicons
        name={loading ? "hourglass-outline" : icon}
        size={16}
        color={active ? colors.volt : colors.chalkMuted}
      />
      <Text className={`text-xs font-bold ${active ? "text-volt" : "text-chalk-muted"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

// Chip do anexo ja selecionado (com X pra remover).
function AttachmentChip({
  icon,
  label,
  sub,
  onRemove,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onRemove: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 bg-ink-850 border border-ink-800 rounded-xl px-3.5 py-3 mt-4">
      <Ionicons name={icon} size={18} color={colors.volt} />
      <View className="flex-1">
        <Text className="text-chalk font-semibold" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-chalk-faint text-xs mt-0.5" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Pressable onPress={onRemove} accessibilityLabel="Remover anexo" className="p-1.5">
        <Ionicons name="close" size={16} color={colors.chalkFaint} />
      </Pressable>
    </View>
  );
}

// Lista simples pra escolher o anexo (treino, rotina ou medida).
function AttachmentPicker({
  title,
  items,
  onPick,
  onClose,
}: {
  title: string;
  items: Array<{ id: string; label: string; sub: string }>;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <View className="mt-4 bg-ink-900 border border-ink-800 rounded-2xl overflow-hidden">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-ink-850">
        <Text className="text-chalk font-bold text-sm">{title}</Text>
        <Pressable onPress={onClose} accessibilityLabel="Fechar seletor">
          <Ionicons name="chevron-up" size={18} color={colors.chalkFaint} />
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Text className="text-chalk-faint text-sm px-4 py-4">Nada pra anexar ainda.</Text>
      ) : (
        items.map((it, i) => (
          <Pressable
            key={it.id}
            onPress={() => onPick(it.id)}
            accessibilityRole="button"
            className={`px-4 py-3 active:bg-ink-850 ${
              i < items.length - 1 ? "border-b border-ink-850" : ""
            }`}
          >
            <Text className="text-chalk font-semibold text-[15px]" numberOfLines={1}>
              {it.label}
            </Text>
            <Text className="text-chalk-faint text-xs mt-0.5">{it.sub}</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}
