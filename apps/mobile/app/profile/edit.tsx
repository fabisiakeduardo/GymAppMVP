import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Button } from "../../src/components/Button";
import { Field, ErrorText } from "../../src/components/ui";
import { Avatar } from "../../src/components/Avatar";
import { ActionSheet } from "../../src/components/ActionSheet";
import { useUpdateMe } from "../../src/api/hooks";
import { useAuth } from "../../src/store/auth";
import { maskDateBR, sanitizeInt, parseDecimal } from "../../src/lib/masks";
import {
  getDefaultRestSeconds,
  setDefaultRestSeconds,
  REST_PRESET_OPTIONS,
} from "../../src/store/prefs";
import { colors } from "../../src/theme/colors";

// DD/MM/YYYY -> YYYY-MM-DD (com validacao de data de verdade).
function toIsoDate(br: string): string | null {
  const m = br.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd), mo = Number(mm), y = Number(yyyy);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > new Date().getFullYear()) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${yyyy}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// YYYY-MM-DD -> DD/MM/YYYY pra exibir no campo.
function toBrDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function EditProfile() {
  const { user, refreshMe } = useAuth();
  const update = useUpdateMe();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [height, setHeight] = useState(user?.heightCm ? String(user.heightCm) : "");
  const [birth, setBirth] = useState(toBrDate(user?.birthDate ?? null));
  const [rest, setRest] = useState<number>(90);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // undefined = nao mexeu | null = remover | string = nova foto (data URL)
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState(false);

  useEffect(() => {
    getDefaultRestSeconds().then(setRest);
  }, []);

  async function pickPhoto() {
    setPicking(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true, // crop 1:1 nativo
        aspect: [1, 1],
      });
      const asset = res.assets?.[0];
      if (res.canceled || !asset) return;
      // Comprime pra 256px jpeg — vira ~20-40KB de data URL, leve pro PATCH.
      const edited = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 256 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (edited.base64) {
        setAvatar(`data:image/jpeg;base64,${edited.base64}`);
      } else {
        setError("Não deu pra processar a foto.");
      }
    } catch {
      setError("Não deu pra abrir a galeria.");
    } finally {
      setPicking(false);
    }
  }


  async function save() {
    const h = parseDecimal(height);
    if (name.trim().length < 1) {
      setError("O nome não pode ficar vazio.");
      return;
    }
    if (h !== null && (h < 50 || h > 300)) {
      setError("Altura em cm — informe um valor entre 50 e 300.");
      return;
    }
    const iso = birth.trim() ? toIsoDate(birth) : null;
    if (birth.trim() && !iso) {
      setError("Data de nascimento no formato DD/MM/AAAA.");
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({
        name: name.trim(),
        bio: bio.trim() || null,
        heightCm: h,
        birthDate: birth.trim() ? iso : null,
        // So manda o avatar se o user mexeu nele.
        ...(avatar !== undefined ? { avatarUrl: avatar } : {}),
      });
      await setDefaultRestSeconds(rest);
      await refreshMe();
      setSaved(true);
      setTimeout(() => router.back(), 350);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

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
          Editar perfil
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-28">
        {/* Avatar: toca pra trocar/remover */}
        <View className="items-center mb-6">
          <Pressable onPress={() => setAvatarMenu(true)} accessibilityLabel="Trocar foto de perfil">
            <Avatar
              uri={avatar === undefined ? user?.avatarUrl : avatar}
              name={name || user?.name || "?"}
              size={96}
            />
            <View className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-volt items-center justify-center border-4 border-ink-950">
              <Ionicons name={picking ? "hourglass-outline" : "camera"} size={14} color={colors.voltOn} />
            </View>
          </Pressable>
          <Text className="text-chalk-faint text-xs mt-2">Toca na foto pra trocar</Text>
        </View>

        <ActionSheet
          visible={avatarMenu}
          title="Foto de perfil"
          onClose={() => setAvatarMenu(false)}
          options={[
            { label: "Escolher foto", onPress: pickPhoto },
            ...(user?.avatarUrl || avatar
              ? [{ label: "Remover foto", destructive: true, onPress: () => setAvatar(null) }]
              : []),
          ]}
        />

        <Field label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />

        <Field
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Ex: foco no supino 💪"
          maxLength={160}
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label="Altura (cm)"
              value={height}
              onChangeText={(t) => setHeight(sanitizeInt(t, 3))}
              placeholder="Ex: 178"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <View className="flex-1">
            <Field
              label="Nascimento"
              value={birth}
              onChangeText={(t) => setBirth(maskDateBR(t))}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        <Text className="text-chalk-faint text-[13px] mb-2 mt-2">
          Descanso padrão entre séries
        </Text>
        <View className="flex-row gap-2">
          {REST_PRESET_OPTIONS.map((s) => {
            const active = s === rest;
            return (
              <Pressable
                key={s}
                onPress={() => setRest(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`flex-1 py-3 rounded-xl items-center border ${
                  active ? "bg-volt border-volt" : "bg-ink-900 border-ink-800 active:bg-ink-850"
                }`}
              >
                <Text className={`font-bold text-sm ${active ? "text-volt-on" : "text-chalk"}`}>
                  {s}s
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-chalk-faint text-xs mt-2">
          Vale para o próximo treino. O timer de descanso inicia nesse tempo ao
          concluir uma série.
        </Text>

        <ErrorText message={error} />
        {saved ? (
          <Text className="text-volt text-sm mt-2 font-semibold">Salvo.</Text>
        ) : null}
      </ScrollView>

      <View className="absolute left-0 right-0 bottom-0 px-5 py-4 bg-ink-950 border-t border-ink-850">
        <Button label="Salvar perfil" onPress={save} loading={update.isPending} />
      </View>
    </SafeAreaView>
  );
}
