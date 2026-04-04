import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../../src/theme';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={[styles.title, { color: colors.textHeading }]}>Dashboard</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Live market data & model verdict
      </Text>

      {/* Placeholder cards */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.gold }]}>TSLA</Text>
        <Text style={[styles.cardValue, { color: colors.textHeading }]}>$361.83</Text>
        <Text style={[styles.cardSub, { color: colors.positive }]}>▲ +1.2%</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textMuted }]}>Model Verdict</Text>
        <Text style={[styles.cardValue, { color: colors.gold }]}>HIGH VOL</Text>
        <Text style={[styles.cardSub, { color: colors.textMuted }]}>Position Size: 50%</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 4 },
});
