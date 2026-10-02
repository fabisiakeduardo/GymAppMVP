import React, { useRef, useState } from "react";
import { Animated, View, Text, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MEASUREMENT_LABELS, type MeasurementKey } from "@gymapp/shared/constants";
import { Avatar } from "./Avatar";
import { useAuth } from "../store/auth";
import { useLikePost, useDeletePost, useSaveRoutine } from "../api/hooks";
import { formatClock } from "../live/model";
import { colors } from "../theme/colors";
import type {
  Post,
  WorkoutSnapshot,
  RoutineSnapshot,
  BodyMetricSnapshot,
} from "../api/types";

// "agora", "12min", "3h", "2d", ou data curta pra coisa velha.
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Formata volume: 12345 -> "12,3t"; 850 -> "850 kg".
function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")}t`;
  return `${Math.round(kg)} kg`;
}

interface PostCardProps {
  post: Post;
  onDeleted?: () => void;
}

// Card de post do feed. Snapshot vem denormalizado do servidor — renderiza
// sem depender de workout/rotina/medida ainda existirem.
export function PostCard({ post, onDeleted }: PostCardProps) {
  const { user } = useAuth();
  const likeMut = useLikePost();
  const deleteMut = useDeletePost();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Curtida otimista local: o coracao responde na hora e a mutacao reconcilia.
  const [liked, setLiked] = useState<boolean | null>(null);
  const effectiveLiked = liked ?? post.likedByMe;
  const effectiveCount = post.likesCount + (liked === null ? 0 : liked ? 1 : -1);
  const heartScale = useRef(new Animated.Value(1)).current;

  // Pop so ao curtir (desfazer nao comemora).
  function popHeart() {
    heartScale.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.4,
        speed: 60,
        bounciness: 14,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        speed: 24,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function toggleLike() {
    const next = !effectiveLiked;
    setLiked(next);
    if (next) popHeart();
    likeMut.mutate(
      { postId: post.id, like: next },
      { onError: () => setLiked(null) },
    );
  }

  function goToAuthor() {
    router.push(`/social/user/${post.author.id}`);
  }

  const isMine = user?.id === post.author.id;

  return (
    <View className="bg-ink-900 border border-ink-800 rounded-2xl p-4 mb-3">
      {/* Header: autor + tempo + menu */}
      <View className="flex-row items-center gap-3">
        <Pressable onPress={goToAuthor} accessibilityLabel={`Perfil de ${post.author.name}`}>
          <Avatar uri={post.author.avatarUrl} name={post.author.name} size={40} />
        </Pressable>
        <Pressable onPress={goToAuthor} className="flex-1">
          <Text className="text-chalk font-bold text-[15px]" numberOfLines={1}>
            {post.author.name}
          </Text>
          <Text className="text-chalk-faint text-xs mt-0.5">{timeAgo(post.createdAt)}</Text>
        </Pressable>
        {isMine ? (
          <Pressable
            onPress={() => setConfirmDelete(true)}
            accessibilityLabel="Apagar post"
            className="w-9 h-9 items-center justify-center"
          >
            <Ionicons name="trash-outline" size={17} color={colors.chalkFaint} />
          </Pressable>
        ) : null}
      </View>

      {post.caption ? (
        <Text className="text-chalk text-[15px] leading-6 mt-3">{post.caption}</Text>
      ) : null}

      {post.mediaUrls.length > 0 ? (
        <View className="flex-row gap-2 mt-3">
          {post.mediaUrls.slice(0, 4).map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              className="flex-1 rounded-xl bg-ink-850"
              style={{ aspectRatio: post.mediaUrls.length === 1 ? 16 / 10 : 1 }}
              accessibilityLabel={`Foto ${i + 1} do post`}
            />
          ))}
        </View>
      ) : null}

      {post.snapshot.map((snap, i) => {
        if (snap.kind === "workout") return <WorkoutBlock key={i} snap={snap} />;
        if (snap.kind === "routine")
          return <RoutineBlock key={i} snap={snap} postId={post.id} isMine={isMine} />;
        if (snap.kind === "body_metric") return <BodyMetricBlock key={i} snap={snap} />;
        return null;
      })}

      {/* Acoes: curtir + comentar */}
      <View className="flex-row items-center gap-6 mt-3 pt-3 border-t border-ink-850">
        <View className="flex-row items-center">
          <Pressable
            onPress={toggleLike}
            accessibilityRole="button"
            accessibilityLabel={effectiveLiked ? "Descurtir" : "Curtir"}
            accessibilityState={{ selected: effectiveLiked }}
            className="flex-row items-center gap-1.5 py-1"
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={effectiveLiked ? "heart" : "heart-outline"}
                size={20}
                color={effectiveLiked ? colors.blood : colors.chalkMuted}
              />
            </Animated.View>
          </Pressable>
          {/* Contagem leva pra lista de quem curtiu (estilo Instagram). */}
          <Pressable
            onPress={() => router.push(`/social/post/${post.id}/likes`)}
            accessibilityLabel="Ver quem curtiu"
            className="py-1"
          >
            <Text
              className={`text-sm font-semibold ${effectiveLiked ? "text-blood" : "text-chalk-muted"}`}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {effectiveCount}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push(`/social/post/${post.id}`)}
          accessibilityRole="button"
          accessibilityLabel="Ver comentarios"
          className="flex-row items-center gap-1.5 py-1"
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.chalkMuted} />
          <Text
            className="text-chalk-muted text-sm font-semibold"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {post.commentsCount}
          </Text>
        </Pressable>
      </View>

      {/* Confirmacao inline de apagar (simples, sem modal) */}
      {confirmDelete ? (
        <View className="flex-row items-center gap-3 mt-3 bg-blood/10 border border-blood/40 rounded-xl px-3 py-2.5">
          <Text className="text-blood text-sm flex-1">Apagar esse post?</Text>
          <Pressable
            onPress={async () => {
              await deleteMut.mutateAsync(post.id).catch(() => {});
              setConfirmDelete(false);
              onDeleted?.();
            }}
            className="px-3 py-1.5 rounded-lg bg-blood/20"
            accessibilityLabel="Confirmar apagar"
          >
            <Text className="text-blood text-sm font-bold">Apagar</Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmDelete(false)}
            className="px-3 py-1.5"
            accessibilityLabel="Cancelar"
          >
            <Text className="text-chalk-muted text-sm">Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// Treino compartilhado: rotina, duracao, series, volume e top exercicios.
function WorkoutBlock({ snap }: { snap: WorkoutSnapshot }) {
  return (
    <View className="mt-3 bg-ink-850 border border-ink-800 rounded-xl p-3.5">
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name="barbell" size={15} color={colors.volt} />
        <Text className="text-chalk font-bold flex-1" numberOfLines={1}>
          {snap.routineName ?? "Treino livre"}
        </Text>
        <Text className="text-chalk-faint text-xs">
          {new Date(snap.startedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </Text>
      </View>

      <View className="flex-row gap-4 mb-2.5">
        {[
          snap.durationSec !== null ? formatClock(snap.durationSec) : "—",
          `${snap.setsDone} séries`,
          snap.volumeKg > 0 ? fmtVolume(snap.volumeKg) : null,
        ]
          .filter(Boolean)
          .map((txt, i) => (
            <Text key={i} className="text-chalk-muted text-[13px]" style={{ fontVariant: ["tabular-nums"] }}>
              {txt}
            </Text>
          ))}
      </View>

      {snap.exercises.slice(0, 4).map((e) => (
        <View key={e.exerciseId} className="flex-row items-center justify-between py-1">
          <Text className="text-chalk-muted text-[13px] flex-1 mr-2" numberOfLines={1}>
            {e.sets}× {e.name}
          </Text>
          <Text className="text-chalk-faint text-xs" style={{ fontVariant: ["tabular-nums"] }}>
            {e.topWeight} kg × {e.topReps}
          </Text>
        </View>
      ))}
      {snap.exercises.length > 4 ? (
        <Text className="text-chalk-faint text-xs mt-1">
          +{snap.exercises.length - 4} exercícios
        </Text>
      ) : null}
    </View>
  );
}

// Rotina compartilhada: exercicios alvo + botao de importar pro viewer.
function RoutineBlock({
  snap,
  postId,
  isMine,
}: {
  snap: RoutineSnapshot;
  postId: string;
  isMine: boolean;
}) {
  const save = useSaveRoutine();
  const [saved, setSaved] = useState(false);

  return (
    <View className="mt-3 bg-ink-850 border border-ink-800 rounded-xl p-3.5">
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name="list" size={15} color={colors.volt} />
        <Text className="text-chalk font-bold flex-1" numberOfLines={1}>
          {snap.name}
        </Text>
        <Text className="text-chalk-faint text-xs">{snap.exercises.length} exercícios</Text>
      </View>

      {snap.exercises.slice(0, 4).map((e) => (
        <View key={e.exerciseId} className="flex-row items-center justify-between py-1">
          <Text className="text-chalk-muted text-[13px] flex-1 mr-2" numberOfLines={1}>
            {e.name}
          </Text>
          <Text className="text-chalk-faint text-xs" style={{ fontVariant: ["tabular-nums"] }}>
            {e.targetSets}×{e.targetReps}
            {e.targetWeight ? ` · ${e.targetWeight}kg` : ""}
          </Text>
        </View>
      ))}
      {snap.exercises.length > 4 ? (
        <Text className="text-chalk-faint text-xs mt-1">
          +{snap.exercises.length - 4} exercícios
        </Text>
      ) : null}

      {!isMine ? (
        <Pressable
          onPress={() =>
            save.mutate(postId, {
              onSuccess: () => setSaved(true),
            })
          }
          disabled={save.isPending || saved}
          accessibilityRole="button"
          accessibilityLabel="Salvar rotina"
          className={`mt-2.5 py-2.5 rounded-xl items-center border ${
            saved ? "bg-volt-wash border-volt/40" : "bg-ink-900 border-ink-700 active:bg-ink-800"
          }`}
        >
          <Text className={`text-sm font-bold ${saved ? "text-volt" : "text-chalk"}`}>
            {saved ? "Salva nas suas rotinas" : save.isPending ? "Salvando…" : "Salvar rotina"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Medidas corporais compartilhadas.
function BodyMetricBlock({ snap }: { snap: BodyMetricSnapshot }) {
  const chips: string[] = [];
  if (snap.weightKg !== null) chips.push(`${snap.weightKg} kg`);
  if (snap.bodyFat !== null) chips.push(`${snap.bodyFat}% gordura`);
  for (const [k, v] of Object.entries(snap.measurements)) {
    if (v == null) continue;
    const label = MEASUREMENT_LABELS[k as MeasurementKey] ?? k;
    chips.push(`${label} ${v} cm`);
  }

  return (
    <View className="mt-3 bg-ink-850 border border-ink-800 rounded-xl p-3.5">
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name="body" size={15} color={colors.volt} />
        <Text className="text-chalk font-bold flex-1">Progresso corporal</Text>
        <Text className="text-chalk-faint text-xs">
          {new Date(`${snap.date}T00:00:00`).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        {chips.slice(0, 8).map((c, i) => (
          <View key={i} className="bg-ink-900 border border-ink-800 rounded-full px-2.5 py-1">
            <Text className="text-chalk-muted text-xs font-semibold">{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
