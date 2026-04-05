import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '../../theme';

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '1.0.0';

/**
 * Small muted footer showing app version and branding.
 */
export function AppVersion() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.textMuted }]}>
        v{APP_VERSION} · DappGo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 24,
  },
  text: {
    fontSize: 11,
    fontWeight: '400',
  },
});
