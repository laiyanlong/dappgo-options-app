import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/ui/Card';

const TICKERS = ['TSLA', 'NVDA', 'AAPL', 'AMZN'];
const EXPIRIES = ['Apr 11', 'Apr 18', 'Apr 25', 'May 2'];

const STRIKES = [
  { strike: 340, call: 24.50, put: 2.80, callDelta: 0.82, putDelta: -0.18, iv: 52 },
  { strike: 350, call: 16.20, put: 4.30, callDelta: 0.68, putDelta: -0.32, iv: 48 },
  { strike: 360, call: 9.80, put: 7.90, callDelta: 0.50, putDelta: -0.50, iv: 45 },
  { strike: 370, call: 5.10, put: 13.20, callDelta: 0.32, putDelta: -0.68, iv: 47 },
  { strike: 380, call: 2.40, put: 20.50, callDelta: 0.18, putDelta: -0.82, iv: 51 },
];

export default function MatrixScreen() {
  const { colors } = useTheme();
  const [selectedTicker, setSelectedTicker] = React.useState(0);
  const [selectedExpiry, setSelectedExpiry] = React.useState(0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textHeading }]}>Options Matrix</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Strike comparison
      </Text>

      {/* Ticker selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {TICKERS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.chip,
              {
                backgroundColor: i === selectedTicker ? colors.accent : colors.card,
                borderColor: i === selectedTicker ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setSelectedTicker(i)}
          >
            <Text
              style={[
                styles.chipText,
                { color: i === selectedTicker ? '#fff' : colors.textMuted },
              ]}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Expiry tabs */}
      <View style={[styles.expiryRow, { borderBottomColor: colors.border }]}>
        {EXPIRIES.map((e, i) => (
          <TouchableOpacity
            key={e}
            style={[
              styles.expiryTab,
              i === selectedExpiry && { borderBottomColor: colors.gold, borderBottomWidth: 2 },
            ]}
            onPress={() => setSelectedExpiry(i)}
          >
            <Text
              style={[
                styles.expiryText,
                { color: i === selectedExpiry ? colors.gold : colors.textMuted },
              ]}
            >
              {e}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerCell, styles.strikeCol, { color: colors.textMuted }]}>Strike</Text>
        <Text style={[styles.headerCell, styles.priceCol, { color: colors.textMuted }]}>Call</Text>
        <Text style={[styles.headerCell, styles.priceCol, { color: colors.textMuted }]}>Put</Text>
        <Text style={[styles.headerCell, styles.ivCol, { color: colors.textMuted }]}>IV%</Text>
      </View>

      {/* Strike rows */}
      {STRIKES.map((s) => (
        <Card key={s.strike} style={styles.strikeCard}>
          <View style={styles.strikeRow}>
            <Text style={[styles.cell, styles.strikeCol, { color: colors.textHeading, fontWeight: '700' }]}>
              ${s.strike}
            </Text>
            <View style={styles.priceCol}>
              <Text style={[styles.cell, { color: colors.positive }]}>${s.call.toFixed(2)}</Text>
              <Text style={[styles.delta, { color: colors.textMuted }]}>{s.callDelta.toFixed(2)}</Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={[styles.cell, { color: colors.negative }]}>${s.put.toFixed(2)}</Text>
              <Text style={[styles.delta, { color: colors.textMuted }]}>{s.putDelta.toFixed(2)}</Text>
            </View>
            <Text style={[styles.cell, styles.ivCol, { color: colors.gold }]}>{s.iv}%</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  chips: { flexDirection: 'row', marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  expiryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  expiryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  expiryText: { fontSize: 13, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  headerCell: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  strikeCard: { paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6 },
  strikeRow: { flexDirection: 'row', alignItems: 'center' },
  cell: { fontSize: 14 },
  strikeCol: { width: 70 },
  priceCol: { flex: 1 },
  ivCol: { width: 50, textAlign: 'right' },
  delta: { fontSize: 11, marginTop: 1 },
});
