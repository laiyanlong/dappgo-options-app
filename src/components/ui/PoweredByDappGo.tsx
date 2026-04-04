import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

/**
 * Small centered "Powered by DappGo" footer branding.
 */
export function PoweredByDappGo() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.row}>
        <Text style={[styles.powered, { color: colors.textMuted }]}>
          Powered by{' '}
        </Text>
        <Text style={[styles.brand, { color: colors.gold }]}>DappGo</Text>
      </Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        AI Automation
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  row: {
    fontSize: 13,
  },
  powered: {
    fontSize: 13,
  },
  brand: {
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    fontSize: 11,
    marginTop: 2,
  },
});
