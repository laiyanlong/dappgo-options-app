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

export default function BacktestScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = React.useState<'simple' | 'advanced'>('simple');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textHeading }]}>Backtest</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Validate strategies
      </Text>

      {/* Mode toggle */}
      <View style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            mode === 'simple' && { backgroundColor: colors.accent },
          ]}
          onPress={() => setMode('simple')}
        >
          <Text style={[styles.toggleText, { color: mode === 'simple' ? '#fff' : colors.textMuted }]}>
            Simple
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            mode === 'advanced' && { backgroundColor: colors.accent },
          ]}
          onPress={() => setMode('advanced')}
        >
          <Text style={[styles.toggleText, { color: mode === 'advanced' ? '#fff' : colors.textMuted }]}>
            Advanced
          </Text>
        </TouchableOpacity>
      </View>

      {/* Parameters */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.textHeading }]}>Parameters</Text>
        <View style={styles.paramRow}>
          <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Ticker</Text>
          <Text style={[styles.paramValue, { color: colors.textHeading }]}>TSLA</Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Period</Text>
          <Text style={[styles.paramValue, { color: colors.textHeading }]}>30 days</Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Strategy</Text>
          <Text style={[styles.paramValue, { color: colors.textHeading }]}>Iron Condor</Text>
        </View>
        {mode === 'advanced' && (
          <>
            <View style={styles.paramRow}>
              <Text style={[styles.paramLabel, { color: colors.textMuted }]}>IV Rank Threshold</Text>
              <Text style={[styles.paramValue, { color: colors.textHeading }]}>30%</Text>
            </View>
            <View style={styles.paramRow}>
              <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Delta Range</Text>
              <Text style={[styles.paramValue, { color: colors.textHeading }]}>0.15 - 0.30</Text>
            </View>
          </>
        )}
      </Card>

      {/* Run button */}
      <TouchableOpacity
        style={[styles.runBtn, { backgroundColor: colors.accent }]}
        activeOpacity={0.8}
      >
        <Text style={styles.runBtnText}>Run Backtest</Text>
      </TouchableOpacity>

      {/* Placeholder result */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.textHeading }]}>Last Result</Text>
        <View style={styles.paramRow}>
          <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Win Rate</Text>
          <Text style={[styles.paramValue, { color: colors.positive }]}>68%</Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Avg P&L</Text>
          <Text style={[styles.paramValue, { color: colors.positive }]}>+$124</Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Max Drawdown</Text>
          <Text style={[styles.paramValue, { color: colors.negative }]}>-$312</Text>
        </View>
        <View style={styles.paramRow}>
          <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Sharpe Ratio</Text>
          <Text style={[styles.paramValue, { color: colors.textHeading }]}>1.42</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  toggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  paramLabel: { fontSize: 14 },
  paramValue: { fontSize: 14, fontWeight: '600' },
  runBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  runBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
