import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "../theme/colors";
import { sanitizeDecimal, sanitizeInt, parseDecimal } from "../lib/masks";
import type { LiveSet } from "../live/model";
import type { LastPerformance } from "../live/lastTime";

const PLATE_STEP = 2.5; // anilha padrao: sobe/desce de 2,5 em 2,5 kg

interface SetRowProps {
  set: LiveSet;
  isCurrent: boolean; // primeira serie nao feita — a fila do treino
  lastTime: LastPerformance | null;
  onComplete: (values: { weight: number; reps: number }) => void;
  onEdit: (values: { weight?: number; reps?: number }) => void;
}

// Linha de UMA serie. Carga com steppers de anilha (+-2,5 kg), campo de reps
// e um botao gigante pra marcar feita — pensado pra usar com uma mao so.
export function SetRow({ set, isCurrent, lastTime, onComplete, onEdit }: SetRowProps) {
  const [weight, setWeight] = useState(set.weight ? String(set.weight) : "");
  const [reps, setReps] = useState(set.reps ? String(set.reps) : "");

  function parseW() {
    return parseFloat(weight.replace(",", ".")) || 0;
  }

  function bump(delta: number) {
    const next = Math.max(0, Math.round((parseW() + delta) * 10) / 10);
    setWeight(String(next));
    onEdit({ weight: next });
    Haptics.selectionAsync().catch(() => {});
  }

  function handleComplete() {
    onComplete({ weight: parseW(), reps: parseInt(reps, 10) || 0 });
  }

  const done = set.completed;

  return (
    <View
      className={`rounded-xl py-2 px-2 ${
        done
          ? "bg-volt-wash"
          : isCurrent
            ? "bg-ink-850 border-l-2 border-volt"
            : ""
      }`}
      accessibilityLabel={`Série ${set.setNumber}${done ? ", concluída" : isCurrent ? ", atual" : ""}`}
    >
      {isCurrent ? (
        <View className="flex-row items-center gap-1.5 mb-1.5 ml-8">
          <View className="w-1.5 h-1.5 rounded-full bg-volt" />
          <Text className="text-volt text-xs font-semibold">
            agora{lastTime ? ` · última vez: ${lastTime.weight} kg × ${lastTime.reps}` : ""}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center gap-2">
        <View className="w-6 items-center">
          <Text
            className={`text-base font-extrabold ${
              done ? "text-volt" : isCurrent ? "text-volt" : "text-chalk-faint"
            }`}
          >
            {set.setNumber}
          </Text>
        </View>

        {/* Carga: stepper de anilha + input */}
        <View
          className={`flex-[3] flex-row items-stretch bg-ink-800 border rounded-xl overflow-hidden ${
            done ? "border-volt/30" : "border-ink-700"
          }`}
        >
          <Stepper icon="remove" label="Reduzir 2,5 kg" onPress={() => bump(-PLATE_STEP)} />
          <View className="flex-1 flex-row items-baseline justify-center py-2">
            <TextInput
              value={weight}
              onChangeText={(t) => {
                setWeight(t);
                onEdit({ weight: parseFloat(t.replace(",", ".")) || 0 });
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.chalkFaint}
              accessibilityLabel={`Carga da série ${set.setNumber} em kg`}
              className="text-chalk text-xl font-bold text-center p-0 min-w-[40px]"
              style={{ color: colors.chalk, fontVariant: ["tabular-nums"] }}
            />
            <Text className="text-chalk-faint text-[10px] ml-0.5">kg</Text>
          </View>
          <Stepper icon="add" label="Aumentar 2,5 kg" onPress={() => bump(PLATE_STEP)} />
        </View>

        {/* Reps */}
        <View
          className={`flex-[2] flex-row items-baseline justify-center bg-ink-800 border rounded-xl py-2 ${
            done ? "border-volt/30" : "border-ink-700"
          }`}
        >
          <TextInput
            value={reps}
            onChangeText={(t) => {
              const v = sanitizeInt(t, 2);
              setReps(v);
              onEdit({ reps: parseInt(v, 10) || 0 });
            }}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            placeholderTextColor={colors.chalkFaint}
            accessibilityLabel={`Repetições da série ${set.setNumber}`}
            className="text-chalk text-xl font-bold text-center p-0 min-w-[32px]"
            style={{ color: colors.chalk, fontVariant: ["tabular-nums"] }}
          />
          <Text className="text-chalk-faint text-[10px] ml-0.5">×</Text>
        </View>

        {/* Marcar feita */}
        <Pressable
          onPress={handleComplete}
          accessibilityRole="button"
          accessibilityLabel={
            done ? `Desmarcar série ${set.setNumber}` : `Marcar série ${set.setNumber} como feita`
          }
          accessibilityState={{ selected: done }}
          className={`w-12 h-12 rounded-xl items-center justify-center ${
            done ? "bg-volt" : "bg-ink-800 border border-ink-700 active:bg-ink-600"
          }`}
        >
          <Ionicons
            name={done ? "checkmark-sharp" : "checkmark"}
            size={24}
            color={done ? colors.voltOn : colors.chalkFaint}
          />
        </Pressable>
      </View>
    </View>
  );
}

function Stepper({
  icon,
  label,
  onPress,
}: {
  icon: "add" | "remove";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="w-9 items-center justify-center active:bg-ink-700"
      hitSlop={4}
    >
      <Ionicons name={icon} size={16} color={colors.chalkMuted} />
    </Pressable>
  );
}
