import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../src/components/Avatar";
import { EmptyState, SkeletonRows } from "../../../src/components/ui";
import { useFollowers, useFollowing } from "../../../src/api/hooks";
import { colors } from "../../../src/theme/colors";
import type { SocialUser } from "../../../src/api/types";

// Lista de seguidores ou seguindo de um perfil — /social/follows/:id?type=followers|following
export default function FollowsList() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const isFollowers = type !== "following";
  const title = isFollowers ? "Seguidores" : "Seguindo";

  const followers = useFollowers(isFollowers ? (id ?? "") : "");
  const following = useFollowing(!isFollowers ? (id ?? "") : "");
  const { data: users, isLoading } = isFollowers ? followers : following;

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          className="w-11 h-11 justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-2xl font-extrabold tracking-tight flex-1">
          {title}
        </Text>
      </View>

      {isLoading ? (
        <View className="px-5">
          <SkeletonRows count={5} />
        </View>
      ) : !users || users.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={isFollowers ? "Sem seguidores ainda" : "Não segue ninguém"}
          body={
            isFollowers
              ? "Quando alguém seguir, aparece aqui."
              : "Pessoas seguidas aparecem aqui."
          }
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerClassName="px-5"
          renderItem={({ item }) => <UserRow user={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function UserRow({ user }: { user: SocialUser }) {
  return (
    <Pressable
      onPress={() => router.push(`/social/user/${user.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Perfil de ${user.name}`}
      className="flex-row items-center gap-3 py-3.5 border-b border-ink-850 active:bg-ink-900 -mx-2 px-2 rounded-lg"
    >
      <Avatar uri={user.avatarUrl} name={user.name} size={44} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-chalk font-semibold" numberOfLines={1}>
            {user.name}
          </Text>
          {user.isPrivate ? (
            <Ionicons name="lock-closed" size={11} color={colors.chalkFaint} />
          ) : null}
        </View>
        {user.bio ? (
          <Text className="text-chalk-faint text-xs mt-0.5" numberOfLines={1}>
            {user.bio}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.chalkFaint} />
    </Pressable>
  );
}
