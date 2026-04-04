import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { useSettingsStore } from '../../src/store/settings-store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const { colors, isDark, mode } = useTheme();
  const settings = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [newTicker, setNewTicker] = React.useState('');
  const [showGeminiKey, setShowGeminiKey] = React.useState(false);

  const handleAddTicker = () => {
    const t = newTicker.trim().toUpperCase();
    if (t && !settings.tickers.includes(t)) {
      settings.addTicker(t);
      setNewTicker('');
    }
  };

  const themeOptions: Array<{ label: string; value: 'dark' | 'light' | 'auto' }> = [
    { label: '🌙 Dark', value: 'dark' },
    { label: '☀️ Light', value: 'light' },
    { label: '⚙️ Auto', value: 'auto' },
  ];

  const langOptions: Array<{ label: string; value: 'zh' | 'en' }> = [
    { label: '繁中', value: 'zh' },
    { label: 'EN', value: 'en' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <Text style={[styles.title, { color: colors.textHeading }]}>Settings</Text>

      {/* ── Profile ── */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PROFILE</Text>
      <Card>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>DG</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textHeading }]}>DappGo User</Text>
            <Text style={[styles.profileSub, { color: colors.textMuted }]}>
              {settings.githubUsername}/{settings.githubRepo}
            </Text>
          </View>
        </View>
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>GitHub User</Text>
          <TextInput
            style={[styles.input, { color: colors.textHeading, borderColor: colors.border }]}
            value={settings.githubUsername}
            onChangeText={settings.setGithubUsername}
            placeholderTextColor={colors.tabInactive}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Repo Name</Text>
          <TextInput
            style={[styles.input, { color: colors.textHeading, borderColor: colors.border }]}
            value={settings.githubRepo}
            onChangeText={settings.setGithubRepo}
            placeholderTextColor={colors.tabInactive}
          />
        </View>
      </Card>

      {/* ── Tickers ── */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>TICKERS</Text>
      <Card>
        <View style={styles.tickerList}>
          {settings.tickers.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => settings.removeTicker(t)}
              style={[styles.tickerChip, { backgroundColor: colors.accent + '22', borderColor: colors.accent }]}
            >
              <Text style={[styles.tickerText, { color: colors.accent }]}>{t}</Text>
              <Ionicons name="close-circle" size={16} color={colors.accent} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.addTickerRow}>
          <TextInput
            style={[styles.addInput, { color: colors.textHeading, borderColor: colors.border }]}
            value={newTicker}
            onChangeText={setNewTicker}
            placeholder="Add ticker..."
            placeholderTextColor={colors.tabInactive}
            autoCapitalize="characters"
            maxLength={5}
            onSubmitEditing={handleAddTicker}
          />
          <TouchableOpacity
            onPress={handleAddTicker}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── API Keys ── */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>API KEYS</Text>
      <Card>
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Gemini API Key</Text>
          <View style={styles.keyRow}>
            <TextInput
              style={[styles.input, { flex: 1, color: colors.textHeading, borderColor: colors.border }]}
              value={settings.geminiApiKey}
              onChangeText={settings.setGeminiApiKey}
              placeholder="AIza..."
              placeholderTextColor={colors.tabInactive}
              secureTextEntry={!showGeminiKey}
            />
            <TouchableOpacity onPress={() => setShowGeminiKey(!showGeminiKey)} style={{ marginLeft: 8 }}>
              <Ionicons name={showGeminiKey ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Alpha Vantage Key</Text>
          <TextInput
            style={[styles.input, { color: colors.textHeading, borderColor: colors.border }]}
            value={settings.alphaVantageKey}
            onChangeText={settings.setAlphaVantageKey}
            placeholder="Free key from alphavantage.co"
            placeholderTextColor={colors.tabInactive}
          />
        </View>
      </Card>

      {/* ── Appearance ── */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>APPEARANCE</Text>
      <Card>
        <Text style={[styles.subLabel, { color: colors.textMuted }]}>Theme</Text>
        <View style={styles.optionRow}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => settings.setThemeMode(opt.value)}
              style={[
                styles.optionBtn,
                {
                  backgroundColor: mode === opt.value ? colors.accent : colors.backgroundAlt,
                  borderColor: mode === opt.value ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: mode === opt.value ? '#fff' : colors.textMuted },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subLabel, { color: colors.textMuted, marginTop: 12 }]}>Language</Text>
        <View style={styles.optionRow}>
          {langOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => settings.setLanguage(opt.value)}
              style={[
                styles.optionBtn,
                {
                  backgroundColor: settings.language === opt.value ? colors.accent : colors.backgroundAlt,
                  borderColor: settings.language === opt.value ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: settings.language === opt.value ? '#fff' : colors.textMuted },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* ── Notifications ── */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
      <Card>
        {([
          { key: 'dailyReport' as const, label: 'Daily Report Ready', icon: 'newspaper-outline' as IoniconsName },
          { key: 'highCpAlert' as const, label: 'High CP Alert (>75)', icon: 'trending-up-outline' as IoniconsName },
          { key: 'ivSpikeAlert' as const, label: 'IV Spike Alert', icon: 'flash-outline' as IoniconsName },
        ]).map((item, idx) => (
          <React.Fragment key={item.key}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            <View style={styles.switchRow}>
              <Ionicons name={item.icon} size={20} color={colors.accent} style={{ marginRight: 12 }} />
              <Text style={[styles.switchLabel, { color: colors.textHeading }]}>{item.label}</Text>
              <Switch
                value={settings.notifications[item.key]}
                onValueChange={(v) => settings.setNotification(item.key, v)}
                trackColor={{ false: colors.border, true: colors.accent + '80' }}
                thumbColor={settings.notifications[item.key] ? colors.accent : colors.tabInactive}
              />
            </View>
          </React.Fragment>
        ))}
      </Card>

      {/* ── About ── */}
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ABOUT</Text>
      <Card>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Version</Text>
          <Text style={[styles.aboutValue, { color: colors.textHeading }]}>1.0.0</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Engine</Text>
          <Text style={[styles.aboutValue, { color: colors.textHeading }]}>Local (TypeScript)</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Data Source</Text>
          <Text style={[styles.aboutValue, { color: colors.textHeading }]}>GitHub + Alpha Vantage</Text>
        </View>
      </Card>

      {/* ── Branding ── */}
      <View style={styles.branding}>
        <Text style={[styles.brandTitle, { color: colors.gold }]}>DappGo</Text>
        <Text style={[styles.brandSub, { color: colors.textMuted }]}>
          AI Automation for Enterprise
        </Text>
        <Text style={[styles.brandUrl, { color: colors.accent }]}>dappgo.com</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 16 },
  sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 12, marginLeft: 4 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  profileInfo: { marginLeft: 14 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileSub: { fontSize: 13, marginTop: 2 },
  inputRow: { marginTop: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  keyRow: { flexDirection: 'row', alignItems: 'center' },
  subLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  tickerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tickerChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tickerText: { fontSize: 13, fontWeight: '600' },
  addTickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  optionText: { fontSize: 13, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  switchLabel: { flex: 1, fontSize: 15 },
  divider: { height: 1, marginLeft: 32, marginVertical: 4 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '600' },
  branding: { alignItems: 'center', paddingVertical: 32, marginBottom: 32 },
  brandTitle: { fontSize: 24, fontWeight: '800' },
  brandSub: { fontSize: 13, marginTop: 4 },
  brandUrl: { fontSize: 12, marginTop: 4 },
});
