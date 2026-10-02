import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCreateStory } from "../../../src/api/hooks";
import { useAuth } from "../../../src/store/auth";
import { Avatar } from "../../../src/components/Avatar";
import { colors } from "../../../src/theme/colors";

// Composer de story estilo Instagram: abre na camera, captura, preview com
// legenda e publica. Galeria fica como atalho no canto. Expira em 24h.
export default function NewStory() {
  const { user } = useAuth();
  const create = useCreateStory();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [capturing, setCapturing] = useState(false);

  // photo = data URL pronta pro POST (apos manipulacao).
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function toDataUrl(uri: string) {
    const edited = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (edited.base64) setPhoto(`data:image/jpeg;base64,${edited.base64}`);
    else setError("Não deu pra processar a foto.");
  }

  async function snap() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (pic?.uri) await toDataUrl(pic.uri);
    } finally {
      setCapturing(false);
    }
  }

  async function pickFromGallery() {
    setError(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [9, 16],
    });
    const asset = res.assets?.[0];
    if (res.canceled || !asset) return;
    await toDataUrl(asset.uri);
  }

  async function publish() {
    if (!photo) return;
    setError(null);
    try {
      await create.mutateAsync({
        mediaUrl: photo,
        caption: caption.trim() || undefined,
      });
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar.");
    }
  }

  // --- Preview (pos-captura): foto fullscreen + legenda + publicar ---
  if (photo) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-ink-950"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Image source={{ uri: photo }} className="absolute inset-0" resizeMode="cover" />
        <View className="absolute inset-0 bg-black/20" />

        <View className="flex-row items-center justify-between px-4 pt-14">
          <Pressable
            onPress={() => setPhoto(null)}
            accessibilityLabel="Refazer foto"
            className="w-11 h-11 items-center justify-center rounded-full bg-ink-950/70"
          >
            <Ionicons name="close" size={22} color={colors.chalk} />
          </Pressable>
        </View>

        <View className="flex-1" />

        {error ? <Text className="text-blood text-sm text-center px-6 mb-2">{error}</Text> : null}
        <View className="px-4 pb-10 gap-3">
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Escreva uma legenda…"
            placeholderTextColor={colors.chalkFaint}
            maxLength={200}
            accessibilityLabel="Legenda do story"
            className="bg-ink-950/70 border border-ink-800 rounded-xl px-4 py-3 text-chalk"
          />
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-2">
              <Avatar uri={user?.avatarUrl} name={user?.name ?? "?"} size={28} />
              <Text className="text-chalk-muted text-sm font-semibold">Seu story</Text>
            </View>
            <View className="flex-1" />
            <Pressable
              onPress={publish}
              disabled={create.isPending}
              accessibilityLabel="Publicar story"
              className={`flex-row items-center gap-2 bg-volt px-5 py-3 rounded-full ${
                create.isPending ? "opacity-60" : ""
              }`}
            >
              {create.isPending ? (
                <ActivityIndicator size="small" color={colors.voltOn} />
              ) : (
                <>
                  <Text className="text-volt-on font-bold">Compartilhar</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.voltOn} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Na web expo-camera e limitado: vai direto pra galeria.
  if (Platform.OS === "web") {
    return (
      <View className="flex-1 bg-ink-950 items-center justify-center px-8 gap-4">
        <Ionicons name="images-outline" size={40} color={colors.chalkFaint} />
        <Text className="text-chalk-muted text-sm text-center">
          No navegador a câmera não abre — escolha uma foto da galeria.
        </Text>
        <Pressable
          onPress={pickFromGallery}
          className="bg-volt px-6 py-3 rounded-xl"
          accessibilityLabel="Escolher foto"
        >
          <Text className="text-volt-on font-bold">Escolher foto</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="py-2" accessibilityLabel="Voltar">
          <Text className="text-chalk-muted">Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  // Permissao negada: pede de novo ou cai pra galeria.
  if (permission && !permission.granted) {
    return (
      <View className="flex-1 bg-ink-950 items-center justify-center px-8 gap-4">
        <Ionicons name="camera-outline" size={40} color={colors.chalkFaint} />
        <Text className="text-chalk-muted text-sm text-center">
          Pra tirar foto direto no app precisamos da câmera.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            onPress={requestPermission}
            className="bg-volt px-6 py-3 rounded-xl"
            accessibilityLabel="Permitir camera"
          >
            <Text className="text-volt-on font-bold">Permitir câmera</Text>
          </Pressable>
        ) : (
          <Text className="text-chalk-faint text-xs text-center">
            Permissão negada — ative nas configurações do aparelho.
          </Text>
        )}
        <Pressable
          onPress={pickFromGallery}
          className="bg-ink-900 border border-ink-800 px-6 py-3 rounded-xl"
          accessibilityLabel="Escolher da galeria"
        >
          <Text className="text-chalk font-semibold">Escolher da galeria</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="py-2" accessibilityLabel="Voltar">
          <Text className="text-chalk-muted">Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink-950">
      <CameraView ref={cameraRef} facing={facing} flash={flash} style={{ flex: 1 }} />

      {/* Topo: fechar + flash */}
      <View className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 pt-14">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Fechar camera"
          className="w-11 h-11 items-center justify-center rounded-full bg-ink-950/60"
        >
          <Ionicons name="close" size={22} color={colors.chalk} />
        </Pressable>
        <Pressable
          onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
          accessibilityLabel={flash === "on" ? "Desligar flash" : "Ligar flash"}
          className="w-11 h-11 items-center justify-center rounded-full bg-ink-950/60"
        >
          <Ionicons
            name={flash === "on" ? "flash" : "flash-off"}
            size={20}
            color={flash === "on" ? colors.volt : colors.chalk}
          />
        </Pressable>
      </View>

      {/* Base: galeria + shutter + flip */}
      <View className="absolute bottom-0 left-0 right-0 pb-12 px-8 flex-row items-center justify-between">
        <Pressable
          onPress={pickFromGallery}
          accessibilityLabel="Escolher da galeria"
          className="w-12 h-12 rounded-xl bg-ink-950/60 border border-ink-700 items-center justify-center"
        >
          <Ionicons name="images-outline" size={20} color={colors.chalk} />
        </Pressable>

        <Pressable
          onPress={snap}
          disabled={capturing || !permission?.granted}
          accessibilityLabel="Tirar foto"
          className="w-[76px] h-[76px] rounded-full border-4 border-chalk items-center justify-center bg-ink-950/40"
        >
          {capturing ? (
            <ActivityIndicator size="small" color={colors.chalk} />
          ) : (
            <View className="w-[60px] h-[60px] rounded-full bg-chalk" />
          )}
        </Pressable>

        <Pressable
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          accessibilityLabel="Virar camera"
          className="w-12 h-12 rounded-xl bg-ink-950/60 border border-ink-700 items-center justify-center"
        >
          <Ionicons name="camera-reverse-outline" size={20} color={colors.chalk} />
        </Pressable>
      </View>
    </View>
  );
}
