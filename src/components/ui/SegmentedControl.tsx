import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

/**
 * Horizontal segmented control with accent-highlighted active segment.
 */
export function SegmentedControl({ segments, selectedIndex, onChange }: SegmentedControlProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {segments.map((label, i) => {
        const active = i === selectedIndex;
        return (
          <TouchableOpacity
            key={label}
            style={[
              styles.segment,
              active && { backgroundColor: colors.accent },
            ]}
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
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
