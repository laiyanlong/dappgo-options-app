import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/ui/Card';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingsRowProps {
  icon: IoniconsName;
  label: string;
  value?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SettingsRow({ icon, label, value, colors }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.6}>
      <Ionicons name={icon} size={20} color={colors.accent} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: colors.textHeading }]}>{label}</Text>
      {value && <Text style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textHeading }]}>Settings</Text>

      {/* Profile */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PROFILE</Text>
      <Card>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>DG</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textHeading }]}>DappGo User</Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>user@dappgo.com</Text>
          </View>
        </View>
      </Card>

      {/* Tickers */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>TICKERS</Text>
      <Card>
        <SettingsRow icon="logo-usd" label="Watched Tickers" value="TSLA, NVDA, AAPL" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="notifications-outline" label="Price Alerts" value="3 active" colors={colors} />
      </Card>

      {/* API Keys */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>API KEYS</Text>
      <Card>
        <SettingsRow icon="key-outline" label="Polygon.io" value="Connected" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="key-outline" label="OpenAI" value="Connected" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="key-outline" label="Supabase" value="Not set" colors={colors} />
      </Card>

      {/* Appearance */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>APPEARANCE</Text>
      <Card>
        <SettingsRow icon="moon-outline" label="Theme" value={isDark ? 'Dark' : 'Light'} colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="color-palette-outline" label="Accent Color" value="Gold" colors={colors} />
      </Card>

      {/* About */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ABOUT</Text>
      <Card>
        <SettingsRow icon="information-circle-outline" label="Version" value="1.0.0" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="document-text-outline" label="Terms of Service" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" colors={colors} />
      </Card>

      {/* Branding */}
      <View style={styles.branding}>
        <Text style={[styles.brandTitle, { color: colors.gold }]}>DappGo</Text>
        <Text style={[styles.brandSub, { color: colors.textMuted }]}>
          Options Intelligence Platform
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 16 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  profileInfo: { marginLeft: 14 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowIcon: { marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 14, marginRight: 6 },
  divider: { height: 1, marginLeft: 32 },
  branding: { alignItems: 'center', paddingVertical: 32 },
  brandTitle: { fontSize: 22, fontWeight: '800' },
  brandSub: { fontSize: 13, marginTop: 4 },
});
