import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';

const REPORTS = [
  { date: '2026-04-04', ticker: 'TSLA', verdict: 'BUY CALL', score: 82, tag: 'HIGH CONF', tagColor: '#00e676' },
  { date: '2026-04-03', ticker: 'TSLA', verdict: 'HOLD', score: 55, tag: 'NEUTRAL', tagColor: '#f5c542' },
  { date: '2026-04-02', ticker: 'NVDA', verdict: 'BUY PUT', score: 71, tag: 'MEDIUM', tagColor: '#ff9800' },
  { date: '2026-04-01', ticker: 'AAPL', verdict: 'BUY CALL', score: 88, tag: 'HIGH CONF', tagColor: '#00e676' },
  { date: '2026-03-31', ticker: 'TSLA', verdict: 'SELL CALL', score: 40, tag: 'LOW CONF', tagColor: '#ff5252' },
];

export default function ReportsScreen() {
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
      <Text style={[styles.title, { color: colors.textHeading }]}>Reports</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Browse daily reports
      </Text>

      {REPORTS.map((r, i) => (
        <Card key={i}>
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={[styles.ticker, { color: colors.gold }]}>{r.ticker}</Text>
              <Text style={[styles.date, { color: colors.textMuted }]}>{r.date}</Text>
            </View>
            <Badge label={r.tag} color={r.tagColor} />
          </View>
          <Text style={[styles.verdict, { color: colors.textHeading }]}>{r.verdict}</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>Confidence</Text>
            <View style={[styles.scoreBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.scoreFill,
                  { width: `${r.score}%`, backgroundColor: r.score >= 70 ? colors.positive : colors.gold },
                ]}
              />
            </View>
            <Text style={[styles.scoreValue, { color: colors.textHeading }]}>{r.score}%</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  left: {},
  ticker: { fontSize: 16, fontWeight: '700' },
  date: { fontSize: 12, marginTop: 2 },
  verdict: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreLabel: { fontSize: 12, width: 72 },
  scoreBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: 6, borderRadius: 3 },
  scoreValue: { fontSize: 13, fontWeight: '600', width: 36, textAlign: 'right' },
});
