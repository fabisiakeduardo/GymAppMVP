import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { Avatar } from "../../src/components/Avatar";
import { EmptyState } from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";
import { useProfileStats, useSocialProfile } from "../../src/api/hooks";
import { colors } from "../../src/theme/colors";

// Formata volume grande: 12345 kg -> "12,3t".
function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")}t`;
  return `${Math.round(kg)} kg`;
}

// Perfil proprio — estilo Instagram: identidade, contagens, acao de editar
// e numeros do atleta. Ajustes e privacidade moram em Configuracoes (engrenagem).
export default function Perfil() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Screen title="Perfil">
        <EmptyState
          icon="person-outline"
          title="Entre ou crie uma conta"
          body="Sua meta, peso e histórico ficam salvos e sincronizados."
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
    <Screen scroll>
      {/* Identidade: inicial grande + nome + email + lapis de edicao */}
      <View className="flex-row items-center gap-4 mb-2">
        <Avatar uri={user.avatarUrl} name={user.name} size={64} />
        <View className="flex-1">
          <Text className="text-chalk text-2xl font-extrabold tracking-tight" numberOfLines={1}>
            {user.name}
          </Text>
          <Text className="text-chalk-faint text-sm mt-0.5" numberOfLines={1}>
            @{user.username}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/profile/settings")}
          accessibilityLabel="Configurações"
          // overflow-hidden corta o fundo do press nos cantos arredondados.
          style={{ borderRadius: 12 }}
          className="w-11 h-11 items-center justify-center overflow-hidden bg-ink-900 border border-ink-800 active:bg-ink-850"
        >
          <Ionicons name="settings-outline" size={20} color={colors.chalkMuted} />
        </Pressable>
      </View>

      {user.bio ? (
        <Text className="text-chalk-muted text-sm leading-5 -mt-1 mb-1">{user.bio}</Text>
      ) : null}

      <SocialCounts userId={user.id} />

      <View className="mb-1">
        <Button
          label="Editar perfil"
          variant="ghost"
          onPress={() => router.push("/profile/edit")}
        />
      </View>

      <StatsRow />
    </Screen>
  );
}

// Numeros do atleta — estilo Hevy: treinos, sequencia de semanas, volume.
function StatsRow() {
  const { data: stats } = useProfileStats();
  if (!stats) return null;

  const items = [
    { label: "Treinos", value: String(stats.totalWorkouts) },
    {
      label: "Sequência",
      value:
        stats.weeklyStreak > 0
          ? `${stats.weeklyStreak} sem`
          : "—",
    },
    { label: "Volume", value: fmtVolume(stats.totalVolumeKg) },
  ];

  return (
    <View className="flex-row gap-2 mt-4">
      {items.map((it) => (
        <View key={it.label} className="flex-1 bg-ink-900 border border-ink-800 rounded-2xl p-3">
          <Text className="text-chalk-faint text-[11px]">{it.label}</Text>
          <Text
            className="text-chalk text-lg font-extrabold mt-0.5"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Contagens sociais do proprio perfil — posts/seguidores/seguindo clicaveis.
function SocialCounts({ userId }: { userId: string }) {
  const { data: profile } = useSocialProfile(userId);

  const items = [
    {
      label: "posts",
      value: profile?.postsCount,
      href: `/social/user/${userId}`,
    },
    {
      label: "seguidores",
      value: profile?.followersCount,
      href: `/social/follows/${userId}?type=followers`,
    },
    {
      label: "seguindo",
      value: profile?.followingCount,
      href: `/social/follows/${userId}?type=following`,
    },
  ];

  return (
    <View className="flex-row bg-ink-900 border border-ink-800 rounded-2xl mb-4">
      {items.map((it, i) => (
        <Pressable
          key={it.label}
          onPress={() => router.push(it.href as never)}
          accessibilityRole="button"
          accessibilityLabel={`${it.value ?? 0} ${it.label}`}
          className={`flex-1 py-3 items-center active:bg-ink-850 ${
            i > 0 ? "border-l border-ink-800" : ""
          }`}
        >
          <Text
            className="text-chalk text-lg font-extrabold"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {it.value ?? "–"}
          </Text>
          <Text className="text-chalk-faint text-[11px] mt-0.5">{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
