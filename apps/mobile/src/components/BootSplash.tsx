import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { colors } from "../theme/colors";

// Splash de boot: wordmark respirando enquanto fontes e sessao carregam.
// Tela preta pura parece app travado — isso sinaliza "ta carregando".
export function BootSplash() {
  const pulse = useRef(new Animated.Value(0.6)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    // Glow radial sobe uma vez e fica — da profundidade ao fundo.
    const glowIn = Animated.timing(glow, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    breathing.start();
    glowIn.start();
    return () => {
      breathing.stop();
      glowIn.stop();
    };
  }, [pulse, glow]);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.ink950 }}
      className="items-center justify-center"
    >
      <Animated.View
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: colors.volt,
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }}
      />
      <Animated.Text
        style={{ opacity: pulse }}
        className="text-volt text-2xl font-extrabold tracking-[6px]"
      >
        MAROMBA
      </Animated.Text>
      <Animated.Text
        style={{ opacity: pulse.interpolate({ inputRange: [0.6, 1], outputRange: [0.2, 0.5] }) }}
        className="text-chalk-faint text-xs mt-3 tracking-wide"
      >
        Preparando seu treino…
      </Animated.Text>
    </View>
  );
}
