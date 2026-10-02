import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Image, Dimensions, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../src/components/Avatar";
import { timeAgo } from "../../../src/components/PostCard";
import { EmptyState } from "../../../src/components/ui";
import {
  useStories,
  useDeleteStory,
  useMarkStoryViewed,
  useLikeStory,
} from "../../../src/api/hooks";
import { colors } from "../../../src/theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const STORY_DURATION_MS = 5000;

// Viewer de stories de um autor: foto em tela cheia, barra de progresso por
// story, toque a direita avanca, a esquerda volta, fecha no fim.
export default function StoryViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: stories } = useStories();
  const deleteStory = useDeleteStory();
  const markViewed = useMarkStoryViewed();
  const likeStory = useLikeStory();

  const userStories = useMemo(
    () => (stories ?? []).filter((s) => s.user.id === id),
    [stories, id],
  );
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = userStories[index];

  // Marca "visto" quando o story aparece (idempotente; autor ignora).
  useEffect(() => {
    if (current && !current.isMine && !current.viewedByMe) {
      markViewed.mutate(current.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Auto-avanco a cada 5s com barra de progresso.
  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const p = (Date.now() - start) / STORY_DURATION_MS;
      if (p >= 1) {
        next();
      } else {
        setProgress(p);
      }
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, userStories.length]);

  function next() {
    if (index < userStories.length - 1) setIndex(index + 1);
    else router.back();
  }
  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  if (!current) {
    return (
      <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
        <View className="px-5 pt-2 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Fechar"
            className="w-11 h-11 justify-center"
          >
            <Ionicons name="close" size={26} color={colors.chalk} />
          </Pressable>
        </View>
        <EmptyState
          icon="time-outline"
          title="Story expirado"
          body="Esse story não está mais disponível."
        />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-ink-950">
      <Image
        source={{ uri: current.mediaUrl }}
        className="absolute inset-0 w-full h-full"
        resizeMode="cover"
        accessibilityLabel={`Story de ${current.user.name}`}
      />
      {/* Gradiente fake: header/footer com fundo translucido */}
      <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
        {/* Barras de progresso */}
        <View className="flex-row gap-1 px-3 pt-2">
          {userStories.map((s, i) => (
            <View key={s.id} className="flex-1 h-0.5 rounded-full bg-chalk/25 overflow-hidden">
              <View
                className="h-full bg-chalk"
                style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
              />
            </View>
          ))}
        </View>

        {/* Header: autor + tempo + acoes */}
        <View className="flex-row items-center gap-2.5 px-4 pt-3">
          <Avatar uri={current.user.avatarUrl} name={current.user.name} size={34} />
          <View className="flex-1">
            <Text className="text-chalk font-bold text-sm">{current.user.name}</Text>
            <Text className="text-chalk/70 text-[11px]">{timeAgo(current.createdAt)}</Text>
          </View>
          {current.isMine ? (
            <Pressable
              onPress={() => setConfirmDelete(true)}
              accessibilityLabel="Apagar story"
              className="w-10 h-10 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={19} color={colors.chalk} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Fechar"
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="close" size={24} color={colors.chalk} />
          </Pressable>
        </View>

        {/* Zonas de toque: esquerda volta, direita avanca */}
        <View className="flex-1 flex-row">
          <Pressable onPress={prev} className="w-1/3" accessibilityLabel="Story anterior" />
          <View className="flex-1" />
          <Pressable onPress={next} className="w-1/3" accessibilityLabel="Proximo story" />
        </View>

        {/* Legenda + barra inferior: like (alheio) ou "visto por" (meu) */}
        {current.caption ? (
          <View className="px-5 pb-2">
            <Text className="text-chalk text-base leading-6 bg-ink-950/50 rounded-xl px-3 py-2 self-start">
              {current.caption}
            </Text>
          </View>
        ) : null}

        {current.isMine ? (
          <View className="px-5 pb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="eye-outline" size={16} color={colors.chalkMuted} />
              <Text className="text-chalk-muted text-xs font-semibold">
                {current.viewCount === 0
                  ? "Ninguém viu ainda"
                  : `Visto por ${current.viewCount}`}
              </Text>
            </View>
            {current.viewers.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-2"
                contentContainerClassName="gap-3"
              >
                {current.viewers.map((v) => (
                  <View key={v.user.id} className="items-center w-12">
                    <View className="relative">
                      <Avatar uri={v.user.avatarUrl} name={v.user.name} size={36} />
                      {v.liked ? (
                        <View className="absolute -bottom-1 -right-1 bg-ink-950 rounded-full p-0.5">
                          <Ionicons name="heart" size={11} color={colors.blood} />
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-chalk-faint text-[10px] mt-1" numberOfLines={1}>
                      {v.user.name.split(" ")[0]}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : (
          <View className="px-5 pb-5 flex-row items-center justify-end gap-4">
            <Pressable
              onPress={() =>
                likeStory.mutate({ storyId: current.id, like: !current.likedByMe })
              }
              accessibilityLabel={current.likedByMe ? "Descurtir story" : "Curtir story"}
              accessibilityState={{ selected: current.likedByMe }}
              hitSlop={10}
              className="w-11 h-11 items-center justify-center"
            >
              <Ionicons
                name={current.likedByMe ? "heart" : "heart-outline"}
                size={30}
                color={current.likedByMe ? colors.blood : colors.chalk}
              />
            </Pressable>
          </View>
        )}
        {confirmDelete ? (
          <View className="mx-5 mb-4 flex-row items-center gap-3 bg-ink-950/80 border border-blood/40 rounded-xl px-3 py-2.5">
            <Text className="text-chalk text-sm flex-1">Apagar esse story?</Text>
            <Pressable
              onPress={async () => {
                await deleteStory.mutateAsync(current.id).catch(() => {});
                router.back();
              }}
              accessibilityLabel="Confirmar apagar"
              className="px-3 py-1.5 rounded-lg bg-blood/20"
            >
              <Text className="text-blood text-sm font-bold">Apagar</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmDelete(false)} accessibilityLabel="Cancelar">
              <Text className="text-chalk-muted text-sm">Cancelar</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
