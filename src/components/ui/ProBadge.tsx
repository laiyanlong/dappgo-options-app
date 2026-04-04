import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Small "PRO" pill badge with gold background and dark text.
 * Used to mark features that would be locked in the free version.
 */
export function ProBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#f5c542',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#1a1a2e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
