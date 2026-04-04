import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const FEATURES = [
  'Unlimited tickers',
  'Advanced backtest',
  'AI commentary',
  'Push alerts',
];

/**
 * Dismissible upgrade card prompting users to learn about DappGo Pro.
 */
export function UpgradePrompt() {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.gold },
      ]}
    >
      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={() => setDismissed(true)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.gold }]}>
        Upgrade to DappGo Pro
      </Text>

      {FEATURES.map((feature) => (
        <View key={feature} style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.positive} />
          <Text style={[styles.featureText, { color: colors.text }]}>
            {feature}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: colors.gold }]}
        onPress={() => Linking.openURL('https://dappgo.com')}
        activeOpacity={0.7}
      >
        <Text style={styles.ctaText}>Learn More</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  dismissBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    fontSize: 14,
  },
  ctaBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '700',
  },
});
