import React, { useEffect, useRef } from 'react';
import { Animated, type ViewStyle, type StyleProp } from 'react-native';

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps children in a fade-in animation when first mounted.
 */
export function FadeIn({ children, duration = 400, delay = 0, style }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
}
