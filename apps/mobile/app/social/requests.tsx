import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../src/components/Avatar";
import { EmptyState, SkeletonRows } from "../../src/components/ui";
import {
  useFollowRequests,
  useAcceptFollow,
  useDeclineFollow,
} from "../../src/api/hooks";
import { colors } from "../../src/theme/colors";
import type { SocialUser } from "../../src/api/types";

// Pedidos de follow recebidos (perfil privado): aceitar ou recusar.
export default function FollowRequests() {
  const { data: requests, isLoading } = useFollowRequests();
  const accept = useAcceptFollow();
  const decline = useDeclineFollow();

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
          Pedidos
        </Text>
      </View>

      {isLoading ? (
        <View className="px-5">
          <SkeletonRows count={3} />
        </View>
      ) : !requests || requests.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Tudo em dia"
          body="Quando alguém pedir pra te seguir, aparece aqui."
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(u) => u.id}
          contentContainerClassName="px-5"
          renderItem={({ item }) => (
            <RequestRow
              user={item}
              busy={accept.isPending || decline.isPending}
              onAccept={() => accept.mutate(item.id)}
              onDecline={() => decline.mutate(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function RequestRow({
  user,
  busy,
  onAccept,
  onDecline,
}: {
  user: SocialUser;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 py-3.5 border-b border-ink-850">
      <Pressable
        onPress={() => router.push(`/social/user/${user.id}`)}
        className="flex-row items-center gap-3 flex-1"
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${user.name}`}
      >
        <Avatar uri={user.avatarUrl} name={user.name} size={44} />
        <View className="flex-1">
          <Text className="text-chalk font-semibold" numberOfLines={1}>
            {user.name}
          </Text>
          <Text className="text-chalk-faint text-xs mt-0.5">quer te seguir</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onAccept}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`Aceitar ${user.name}`}
        className={`px-3.5 py-2 rounded-lg bg-volt ${busy ? "opacity-60" : ""}`}
      >
        <Text className="text-volt-on text-xs font-bold">Aceitar</Text>
      </Pressable>
      <Pressable
        onPress={onDecline}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`Recusar ${user.name}`}
        className={`px-3.5 py-2 rounded-lg border border-ink-700 ${busy ? "opacity-60" : ""}`}
      >
        <Text className="text-chalk-muted text-xs font-bold">Recusar</Text>
      </Pressable>
    </View>
  );
}
