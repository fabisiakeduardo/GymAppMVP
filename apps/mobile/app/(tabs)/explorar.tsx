import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { PostCard } from "../../src/components/PostCard";
import { EmptyState, SkeletonRows } from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";
import {
  useDiscover,
  useUserSearch,
  useFollow,
  useUnfollow,
} from "../../src/api/hooks";
import { colors } from "../../src/theme/colors";
import type { Post, UserSearchResult } from "../../src/api/types";

// Tab Explorar = busca de pessoas + feed global descobrir + sugestoes.
// O feed de seguidos fica na tab Social.
export default function Explorar() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  if (!user) {
    return (
      <Screen title="Explorar">
        <EmptyState
          icon="search-outline"
          title="Entre pra explorar"
          body="Busque amigos e descubra treinos da comunidade."
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
      <Text className="text-chalk text-[34px] leading-9 font-extrabold tracking-tighter mb-4">
        Explorar
      </Text>

      <View className="flex-row items-center bg-ink-900 border border-ink-800 rounded-xl px-3.5 mb-4">
        <Ionicons name="search" size={17} color={colors.chalkFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar pessoas"
          placeholderTextColor={colors.chalkFaint}
          autoCapitalize="none"
          accessibilityLabel="Buscar pessoas"
          className="flex-1 px-3 py-3 text-chalk text-[15px]"
          style={{ color: colors.chalk }}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery("")} accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={17} color={colors.chalkFaint} />
          </Pressable>
        ) : null}
      </View>

      {searching ? <SearchResults query={query} /> : <DiscoverFeed />}
    </Screen>
  );
}

// Posts globais ranqueados + sugestoes de quem seguir.
function DiscoverFeed() {
  const { data, isLoading, isError, refetch, isRefetching } = useDiscover();

  // Volta do detalhe de post/perfil -> dados frescos.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isLoading) return <SkeletonRows count={4} />;
  if (isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Sem conexão"
        body="Não foi possível carregar. Tente de novo."
      >
        <Button label="Tentar novamente" variant="ghost" onPress={() => refetch()} />
      </EmptyState>
    );
  }

  return (
    <FlatList
      data={data?.posts ?? []}
      keyExtractor={(p: Post) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={
        (data?.suggested?.length ?? 0) > 0 ? (
          <View className="mb-3">
            <SuggestedUsers users={data!.suggested} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="planet-outline"
          title="Nada por aqui ainda"
          body="A comunidade ainda está começando. Seja o primeiro a postar."
        >
          <Button
            label="Criar post"
            variant="ghost"
            onPress={() => router.push("/social/compose")}
          />
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
  );
}

// Carrossel horizontal de sugestoes (publicas) — estilo "quem seguir".
function SuggestedUsers({
  users,
}: {
  users: Array<{ id: string; name: string; avatarUrl: string | null; followersCount: number }>;
}) {
  return (
    <View>
      <Text className="text-chalk-faint text-[13px] font-semibold mb-2">Quem seguir</Text>
      <FlatList
        horizontal
        data={users}
        keyExtractor={(u) => u.id}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/social/user/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Perfil de ${item.name}`}
            className="w-32 bg-ink-900 border border-ink-800 rounded-2xl p-3 items-center active:bg-ink-850"
          >
            <Avatar uri={item.avatarUrl} name={item.name} size={44} />
            <Text className="text-chalk text-sm font-bold mt-2" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-chalk-faint text-[11px] mt-0.5">
              {item.followersCount} seguidores
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

// Resultados da busca com botao seguir inline.
function SearchResults({ query }: { query: string }) {
  const { data: users, isLoading } = useUserSearch(query);
  const follow = useFollow();
  const unfollow = useUnfollow();

  if (isLoading) return <SkeletonRows count={3} />;
  if (!users || users.length === 0) {
    return (
      <EmptyState
        icon="search-outline"
        title="Ninguém encontrado"
        body={`Nenhum usuário com "${query}".`}
      />
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => u.id}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => <SearchRow user={item} follow={follow} unfollow={unfollow} />}
    />
  );
}

function SearchRow({
  user,
  follow,
  unfollow,
}: {
  user: UserSearchResult;
  follow: ReturnType<typeof useFollow>;
  unfollow: ReturnType<typeof useUnfollow>;
}) {
  const busy = follow.isPending || unfollow.isPending;
  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-ink-850">
      <Pressable
        onPress={() => router.push(`/social/user/${user.id}`)}
        className="flex-row items-center gap-3 flex-1"
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${user.name}`}
      >
        <Avatar uri={user.avatarUrl} name={user.name} size={40} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-chalk font-semibold" numberOfLines={1}>
              {user.name}
            </Text>
            {user.isPrivate ? (
              <Ionicons name="lock-closed" size={11} color={colors.chalkFaint} />
            ) : null}
          </View>
          <Text className="text-chalk-faint text-xs mt-0.5">
            {user.followersCount} seguidores
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() =>
          user.isFollowing || user.isPending
            ? unfollow.mutate(user.id)
            : follow.mutate(user.id)
        }
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={
          user.isFollowing ? "Deixar de seguir" : user.isPending ? "Cancelar pedido" : "Seguir"
        }
        className={`px-3.5 py-2 rounded-lg border ${
          user.isFollowing || user.isPending
            ? "bg-transparent border-ink-700"
            : "bg-volt border-volt"
        } ${busy ? "opacity-60" : ""}`}
      >
        <Text
          className={`text-xs font-bold ${
            user.isFollowing || user.isPending ? "text-chalk-muted" : "text-volt-on"
          }`}
        >
          {user.isFollowing ? "Seguindo" : user.isPending ? "Solicitado" : "Seguir"}
        </Text>
      </Pressable>
    </View>
  );
}
