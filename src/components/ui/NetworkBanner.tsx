import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/app-store';

/**
 * Red banner shown at top of screen when network is offline.
 * Auto-dismisses when connection is restored (networkStatus === 'online').
 */
export function NetworkBanner() {
  const insets = useSafeAreaInsets();
  const networkStatus = useAppStore((s) => s.networkStatus);

  if (networkStatus !== 'offline') return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 4 }]}>
      <Text style={styles.text}>
        {'\u26A0\uFE0F'} Offline — showing cached data
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#d32f2f',
    paddingBottom: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
