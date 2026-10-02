import React from "react";
import { View, Text, Image } from "react-native";

// Avatar do usuario: foto (avatarUrl) ou inicial do nome. O volt-wash de
// fundo mantem a identidade do app mesmo sem foto.
export function Avatar({
  uri,
  name,
  size = 64,
}: {
  uri: string | null | undefined;
  name: string;
  size?: number;
}) {
  const fontSize = Math.round(size * 0.38);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <View
      className="rounded-full bg-volt-wash border border-volt/40 items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          accessibilityLabel={`Foto de perfil de ${name}`}
        />
      ) : (
        <Text className="text-volt font-extrabold" style={{ fontSize }}>
          {initial}
        </Text>
      )}
    </View>
  );
}
