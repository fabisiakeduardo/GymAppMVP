import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { cssInterop } from "nativewind";

// Pressable animado com suporte a className (NativeWind nao registra
// componentes criados por createAnimatedComponent sozinho).
const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressableBase, { className: "style" });

// Ease-out forte (cubic-bezier(0.23, 1, 0.32, 1)) — entrada comeca rapida,
// parece instantanea sem ser dura.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children: React.ReactNode;
}

// Feedback de toque: afunda pra 0.97 na hora e volta com mola.
// A mola mantem velocidade se o dedo sai no meio — sem "pulo" visual.
export function PressableScale({
  scaleTo = 0.97,
  className,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedPressableBase
      {...props}
      className={className}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => {
        onPressIn?.(e);
        Animated.timing(scale, {
          toValue: scaleTo,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }}
      onPressOut={(e) => {
        onPressOut?.(e);
        Animated.spring(scale, {
          toValue: 1,
          speed: 24,
          bounciness: 6,
          useNativeDriver: true,
        }).start();
      }}
    >
      {children}
    </AnimatedPressableBase>
  );
}

interface FadeInViewProps {
  delay?: number;
  distance?: number;
  duration?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

// Entrada suave: sobe uns pixels enquanto aparece. `delay` permite stagger
// em listas (40-60ms por item, cap nos primeiros).
export function FadeInView({
  delay = 0,
  distance = 10,
  duration = 240,
  className,
  style,
  children,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]).start();
    // anima so no mount — delay/distancia sao de nascenca
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      className={className}
      style={[style, { opacity, transform: [{ translateY }] }]}
    >
      {children}
    </Animated.View>
  );
}

// Delay de stagger pra listas — cap pra nao atrasar itens no fim.
export function staggerDelay(index: number, step = 45, max = 6) {
  return Math.min(index, max) * step;
}
