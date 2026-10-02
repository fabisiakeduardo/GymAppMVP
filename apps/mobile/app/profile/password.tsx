import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { Field, ErrorText } from "../../src/components/ui";
import { useChangePassword } from "../../src/api/hooks";
import { saveTokens } from "../../src/store/tokens";
import { colors } from "../../src/theme/colors";

// Troca de senha. O servidor revoga TODAS as sessoes e devolve um par de
// tokens novo — salvamos aqui pra esse aparelho continuar logado.
export default function ChangePassword() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit() {
    if (!current) return setError("Informe sua senha atual.");
    if (next.length < 8) return setError("A nova senha precisa de pelo menos 8 caracteres.");
    if (next === current) return setError("A nova senha precisa ser diferente da atual.");
    if (next !== confirm) return setError("As senhas não conferem.");
    setError(null);
    try {
      const res = await change.mutateAsync({ currentPassword: current, newPassword: next });
      await saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      setSaved(true);
      setTimeout(() => router.back(), 400);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível trocar a senha.");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          className="w-11 h-11 justify-center -ml-2"
        >
          <Ionicons name="chevron-back" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-2xl font-extrabold tracking-tight flex-1">
          Alterar senha
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
          <Text className="text-chalk-muted text-sm mb-6 leading-5">
            Ao trocar, os outros aparelhos saem da sua conta — só este fica logado.
          </Text>

          <Field
            label="Senha atual"
            value={current}
            onChangeText={setCurrent}
            placeholder="Sua senha atual"
            password
          />
          <Field
            label="Nova senha"
            value={next}
            onChangeText={setNext}
            placeholder="Mínimo de 8 caracteres"
            password
          />
          <Field
            label="Confirmar nova senha"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repita a nova senha"
            password
          />
          {confirm.length > 0 && next !== confirm ? (
            <Text className="text-blood text-xs -mt-2 mb-4">As senhas não conferem.</Text>
          ) : null}

          <ErrorText message={error} />
          <View className="mt-2">
            <Button
              label={saved ? "Senha alterada" : "Salvar nova senha"}
              onPress={submit}
              loading={change.isPending}
              disabled={saved}
              large
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
