import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "../src/components/Button";
import { Field, ErrorText } from "../src/components/ui";
import { useAuth } from "../src/store/auth";
import { useDebounced, useUsernameAvailable } from "../src/api/hooks";
import { colors } from "../src/theme/colors";
import { GOALS, GOAL_LABELS, type Goal } from "@gymapp/shared/constants";

// Mesma regra do servidor: minusculo, letras/numeros/underline/ponto, 3-30.
const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

// Limpa enquanto digita: tira o @ inicial e qualquer char invalido.
function sanitizeUsername(t: string) {
  return t.replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30);
}

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check de @ com debounce — so pergunta quando para de digitar.
  const checkedUsername = useDebounced(username);
  const availability = useUsernameAvailable(checkedUsername);
  const usernameTaken = availability.data?.available === false;

  async function submit() {
    if (name.trim().length < 1) return setError("Informe seu nome.");
    if (!USERNAME_RE.test(username)) {
      return setError("Escolha um @ com 3-30 caracteres: letras, números, _ ou .");
    }
    if (usernameTaken) return setError("Esse @ já está em uso. Tenta outro.");
    if (!email.includes("@")) return setError("E-mail inválido.");
    if (password.length < 8) return setError("A senha precisa de pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");
    setError(null);
    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        username,
        password,
        name: name.trim(),
        goal,
      });
      // Modal pode nao ter historico pra voltar (replace) — navega direto.
      router.replace("/(tabs)/perfil");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-10 pb-8" keyboardShouldPersistTaps="handled">
          <Text className="text-volt text-sm font-extrabold tracking-[3px] mb-6">MAROMBA</Text>
          <Text className="text-chalk text-[34px] leading-10 font-extrabold tracking-tighter">
            Crie sua conta
          </Text>
          <Text className="text-chalk-muted text-[15px] mt-1 mb-8">
            Seu histórico e seus recordes sempre salvos.
          </Text>

          <Field label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
          <Field
            label="Nome de usuário"
            value={username}
            onChangeText={(t) => setUsername(sanitizeUsername(t))}
            placeholder="ex: maria.fit"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
          />
          <UsernameHint
            username={username}
            checking={checkedUsername !== username || availability.isFetching}
            available={availability.data?.available ?? null}
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo de 8 caracteres"
            password
          />
          <Field
            label="Confirmar senha"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repita a senha"
            password
          />
          {confirm.length > 0 && password !== confirm ? (
            <Text className="text-blood text-xs -mt-2 mb-4">As senhas não conferem.</Text>
          ) : null}

          <Text className="text-chalk-faint text-[13px] mb-1.5 mt-1">Sua meta</Text>
          <View className="flex-row gap-2 mb-6">
            {GOALS.map((g) => {
              const active = g === goal;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g)}
                  accessibilityState={{ selected: active }}
                  className={`flex-1 py-3.5 rounded-xl items-center border ${
                    active ? "bg-volt border-volt" : "bg-ink-900 border-ink-800 active:bg-ink-850"
                  }`}
                >
                  <Text className={`font-bold text-sm ${active ? "text-volt-on" : "text-chalk"}`}>
                    {GOAL_LABELS[g]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ErrorText message={error} />
          <Button label="Criar conta" onPress={submit} loading={loading} large />

          <Pressable onPress={() => router.replace("/login")} className="py-4 mt-2">
            <Text className="text-chalk-muted text-center">
              Já possui conta? <Text className="text-volt font-semibold">Entrar</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Linha de status embaixo do campo @: preview -> verificando -> livre/ocupado.
function UsernameHint({
  username,
  checking,
  available,
}: {
  username: string;
  checking: boolean;
  available: boolean | null;
}) {
  if (!username) {
    return (
      <Text className="text-chalk-faint text-xs -mt-2 mb-4">
        É assim que te acham: @seunome
      </Text>
    );
  }
  if (!USERNAME_RE.test(username)) {
    return (
      <Text className="text-chalk-faint text-xs -mt-2 mb-4">
        3-30 caracteres: letras, números, _ ou .
      </Text>
    );
  }
  if (checking) {
    return (
      <View className="flex-row items-center gap-1.5 -mt-2 mb-4">
        <ActivityIndicator size={12} color={colors.chalkFaint} />
        <Text className="text-chalk-faint text-xs">Verificando @{username}…</Text>
      </View>
    );
  }
  if (available === true) {
    return (
      <View className="flex-row items-center gap-1.5 -mt-2 mb-4">
        <Ionicons name="checkmark-circle" size={13} color={colors.volt} />
        <Text className="text-volt text-xs">@{username} está livre</Text>
      </View>
    );
  }
  if (available === false) {
    return (
      <View className="flex-row items-center gap-1.5 -mt-2 mb-4">
        <Ionicons name="close-circle" size={13} color={colors.blood} />
        <Text className="text-blood text-xs">@{username} já está em uso</Text>
      </View>
    );
  }
  return (
    <Text className="text-chalk-faint text-xs -mt-2 mb-4">
      É assim que te acham: @{username}
    </Text>
  );
}
