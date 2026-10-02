import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { PostCard } from "../../src/components/PostCard";
import { EmptyState, SkeletonRows } from "../../src/components/ui";
import { FadeInView, staggerDelay } from "../../src/components/anim";
import { useAuth } from "../../src/store/auth";
import { useFeed, useStories, useUnreadCount } from "../../src/api/hooks";
import { colors } from "../../src/theme/colors";
import type { Post, Story } from "../../src/api/types";

// Tab Social = so o feed. Busca e descoberta ficam na tab Explorar;
// perfil (seguidores, privacidade) fica na tab Perfil.
export default function Social() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useFeed();
  const { data: stories, refetch: refetchStories } = useStories();
  const { data: unread, refetch: refetchUnread } = useUnreadCount();

  // Voltar pra tela (apos postar story/comentar) refaz feed + stories.
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchStories();
      refetchUnread();
    }, [refetch, refetchStories, refetchUnread]),
  );

  if (!user) {
    return (
      <Screen title="Social">
        <EmptyState
          icon="people-outline"
          title="Entre pra ver o feed"
          body="Compartilhe treinos, curta o progresso dos amigos e descubra rotinas da comunidade."
        >
          <View className="w-full gap-3">
            <Button label="Criar conta gratuita" onPress={() => router.push("/register")} />
            <Button label="Já tenho conta" onPress={() => router.push("/login")} variant="ghost" />
          </View>
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      {/* Header: titulo + atalho pra buscar/descobrir + criar post */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-chalk text-[34px] leading-9 font-extrabold tracking-tighter">
          Feed
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push("/social/activity")}
            accessibilityLabel="Atividade"
            className="w-11 h-11 items-center justify-center rounded-xl bg-ink-900 border border-ink-800"
          >
            <Ionicons name="heart-outline" size={19} color={colors.chalkMuted} />
            {(unread?.count ?? 0) > 0 ? (
              <View className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-blood items-center justify-center">
                <Text className="text-chalk text-[9px] font-bold">{unread!.count}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push("/social/compose")}
            accessibilityLabel="Criar post"
            className="w-11 h-11 items-center justify-center rounded-xl bg-volt"
          >
            <Ionicons name="add" size={24} color={colors.voltOn} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <SkeletonRows count={4} />
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Sem conexão"
          body="Não foi possível carregar o feed. Tente de novo."
        >
          <Button label="Tentar novamente" variant="ghost" onPress={() => refetch()} />
        </EmptyState>
      ) : (
        <FlatList
          data={data?.posts ?? []}
          keyExtractor={(p: Post) => p.id}
          renderItem={({ item, index }) => (
            <FadeInView delay={staggerDelay(index)}>
              <PostCard post={item} />
            </FadeInView>
          )}
          ListHeaderComponent={<StoriesBar stories={stories ?? []} myId={user.id} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Feed quieto por aqui"
              body="Siga pessoas na aba Explorar ou compartilhe seu próximo treino pra começar."
            >
              <View className="w-full gap-3">
                <Button
                  label="Compartilhar treino"
                  onPress={() => router.push("/social/compose")}
                />
                <Button
                  label="Descobrir pessoas"
                  variant="ghost"
                  onPress={() => router.push("/(tabs)/explorar")}
                />
              </View>
            </EmptyState>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.volt}
              colors={[colors.volt]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-10"
        />
      )}
    </Screen>
  );
}

// Barra de stories no topo do feed — estilo Instagram. O primeiro circulo
// e sempre o seu (adicionar story); os demais sao de quem voce segue.
function StoriesBar({ stories, myId }: { stories: Story[]; myId: string }) {
  const groups = useMemo(() => {
    const byUser = new Map<string, { user: Story["user"]; stories: Story[] }>();
    for (const s of stories) {
      const g = byUser.get(s.user.id);
      if (g) g.stories.push(s);
      else byUser.set(s.user.id, { user: s.user, stories: [s] });
    }
    // Eu primeiro, depois os seguidos na ordem de chegada.
    const mine = byUser.get(myId);
    const others = [...byUser.values()].filter((g) => g.user.id !== myId);
    return { mine: mine?.stories ?? [], others };
  }, [stories, myId]);

  const { user } = useAuth();

  type StoryItem = { key: string; group?: { user: Story["user"]; stories: Story[] } };
  const items: StoryItem[] = [
    { key: "me" },
    ...groups.others.map((g) => ({ key: g.user.id, group: g })),
  ];

  return (
    <View className="mb-3">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4 py-1"
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) => {
          if (item.key === "me") {
            const hasMine = groups.mine.length > 0;
            return (
              <Pressable
                onPress={() =>
                  // Com story ativo, tocar no circulo abre o viewer (estilo
                  // Insta); o "+" no canto continua abrindo a camera.
                  router.push(hasMine ? `/social/story/${myId}` : "/social/story/new")
                }
                accessibilityLabel={hasMine ? "Ver meu story" : "Adicionar story"}
                className="items-center w-16"
              >
                <View className="relative">
                  {hasMine ? (
                    <View className="rounded-full border-2 border-volt p-0.5">
                      <Avatar uri={user?.avatarUrl} name={user?.name ?? "?"} size={52} />
                    </View>
                  ) : (
                    <Avatar uri={user?.avatarUrl} name={user?.name ?? "?"} size={58} />
                  )}
                  <Pressable
                    onPress={() => router.push("/social/story/new")}
                    accessibilityLabel="Adicionar story"
                    hitSlop={6}
                    className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-volt items-center justify-center border-2 border-ink-950"
                  >
                    <Ionicons name="add" size={14} color={colors.voltOn} />
                  </Pressable>
                </View>
                <Text className="text-chalk-faint text-[11px] mt-1.5" numberOfLines={1}>
                  Seu story
                </Text>
              </Pressable>
            );
          }
          const g = item.group!;
          return (
            <Pressable
              onPress={() => router.push(`/social/story/${g.user.id}`)}
              accessibilityLabel={`Stories de ${g.user.name}`}
              className="items-center w-16"
            >
              {/* Anel volt = story novo, estilo Instagram */}
              <View className="rounded-full border-2 border-volt p-0.5">
                <Avatar uri={g.user.avatarUrl} name={g.user.name} size={52} />
              </View>
              <Text className="text-chalk-muted text-[11px] mt-1.5" numberOfLines={1}>
                {g.user.name}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
