import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../theme';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

/**
 * Horizontal segmented control with animated sliding indicator.
 */
export function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
}: SegmentedControlProps) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const containerWidth = useRef(0);

  const segmentCount = segments.length;

  useEffect(() => {
    if (containerWidth.current > 0 && segmentCount > 0) {
      const segmentWidth = containerWidth.current / segmentCount;
      Animated.spring(slideAnim, {
        toValue: selectedIndex * segmentWidth,
        useNativeDriver: false,
        tension: 300,
        friction: 30,
      }).start();
    }
  }, [selectedIndex, segmentCount, slideAnim]);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    containerWidth.current = width;
    // Set initial position without animation
    if (segmentCount > 0) {
      slideAnim.setValue(selectedIndex * (width / segmentCount));
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.backgroundAlt, borderColor: colors.border },
      ]}
      onLayout={onLayout}
    >
      {/* Animated sliding indicator */}
      {segmentCount > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.accent,
              width: `${100 / segmentCount}%` as unknown as number,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}

      {/* Segment labels */}
      {segments.map((label, i) => {
        const active = i === selectedIndex;
        return (
          <TouchableOpacity
            key={label}
            style={styles.segment}
            onPress={() => onChange(i)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: active ? '#fff' : colors.textMuted },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 0.5,
    padding: 3,
    marginBottom: 16,
    height: 40,
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
