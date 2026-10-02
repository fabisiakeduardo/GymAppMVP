import React from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../../src/components/Avatar";
import { usePostLikes, useFollow, useUnfollow } from "../../../../src/api/hooks";
import { colors } from "../../../../src/theme/colors";
import type { Liker } from "../../../../src/api/types";

// Lista "quem curtiu" — estilo Instagram, com botao seguir inline.
export default function PostLikesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, refetch, isRefetching } = usePostLikes(id ?? "");

  return (
    <View className="flex-1 bg-ink-950">
      <View className="flex-row items-center px-5 pt-14 pb-4 border-b border-ink-850">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="chevron-back" size={22} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-xl font-black ml-1">Curtidas</Text>
      </View>

      <FlatList
        data={data?.users ?? []}
        keyExtractor={(u) => u.id}
        contentContainerClassName="px-5 pb-10"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.volt} />
        }
        ListEmptyComponent={
          <View className="items-center pt-20 gap-3">
            <Ionicons name="heart-outline" size={40} color={colors.chalkFaint} />
            <Text className="text-chalk-muted text-sm">
              {isLoading ? "Carregando…" : "Ninguém curtiu ainda."}
            </Text>
          </View>
        }
        renderItem={({ item }) => <LikerRow liker={item} />}
      />
    </View>
  );
}

function LikerRow({ liker }: { liker: Liker }) {
  const follow = useFollow();
  const unfollow = useUnfollow();
  const busy = follow.isPending || unfollow.isPending;

  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-ink-850">
      <Pressable
        onPress={() => router.push(`/social/user/${liker.id}`)}
        accessibilityLabel={`Perfil de ${liker.name}`}
        className="flex-1 flex-row items-center gap-3"
      >
        <Avatar uri={liker.avatarUrl} name={liker.name} size={44} />
        <View className="flex-1">
          <Text className="text-chalk font-bold text-[15px]" numberOfLines={1}>
            {liker.name}
          </Text>
          {liker.isPrivate ? (
            <Text className="text-chalk-faint text-xs mt-0.5">Perfil privado</Text>
          ) : null}
        </View>
      </Pressable>
      {liker.isMe ? null : (
        <Pressable
          onPress={() =>
            liker.isFollowing || liker.isPending
              ? unfollow.mutate(liker.id)
              : follow.mutate(liker.id)
          }
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={
            liker.isFollowing ? "Deixar de seguir" : liker.isPending ? "Cancelar pedido" : "Seguir"
          }
          className={`px-3.5 py-2 rounded-lg border ${
            liker.isFollowing || liker.isPending
              ? "bg-transparent border-ink-700"
              : "bg-volt border-volt"
          } ${busy ? "opacity-60" : ""}`}
        >
          <Text
            className={`text-xs font-bold ${
              liker.isFollowing || liker.isPending ? "text-chalk-muted" : "text-volt-on"
            }`}
          >
            {liker.isFollowing ? "Seguindo" : liker.isPending ? "Solicitado" : "Seguir"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
