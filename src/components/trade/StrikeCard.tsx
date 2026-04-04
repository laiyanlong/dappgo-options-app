import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Card } from '../ui/Card';
import { StarRating } from '../ui/StarRating';
import { formatDollar, formatVolume } from '../../utils/format';
import type { OptionEntry } from '../../utils/types';

interface StrikeCardProps {
  /** The option entry data to display */
  entry: OptionEntry;
  /** Current stock price (for OTM % display) */
  currentPrice: number;
  /** Whether this strike is the best overall pick */
  isBest: boolean;
  /** Whether this card is checked for compare mode */
  isChecked: boolean;
  /** Toggle compare checkbox */
  onToggleCompare: () => void;
  /** Navigate to backtest for this strike */
  onBacktest: () => void;
}

/**
 * Calculate a star rating (0-5) based on POP, annualized return, and spread quality.
 * Weights: POP 40%, annualized 35%, spread 25%.
 */
function calculateStarRating(entry: OptionEntry): number {
  // POP score: 0-5 scale (50% => 2.5, 80% => 4, 90% => 4.5)
  const popScore = Math.min(5, (entry.pop / 100) * 5);

  // Annualized score: 0-5 scale (cap at 100%)
  const annScore = Math.min(5, (entry.annualized / 100) * 5);

  // Spread score: based on quality label
  const spreadScoreMap: Record<string, number> = {
    Excellent: 5,
    Good: 4,
    Fair: 2.5,
    Poor: 1,
  };
  const spreadScore = spreadScoreMap[entry.spreadQuality] ?? 2;

  return popScore * 0.4 + annScore * 0.35 + spreadScore * 0.25;
}

/**
 * Rich strike card showing all key metrics for an option contract.
 * Used in the Matrix screen's FlatList.
 */
export function StrikeCard({
  entry,
  currentPrice,
  isBest,
  isChecked,
  onToggleCompare,
  onBacktest,
}: StrikeCardProps) {
  const { colors } = useTheme();
  const stars = calculateStarRating(entry);

  // Color helpers
  const popColor =
    entry.pop >= 70
      ? colors.positive
      : entry.pop >= 50
        ? colors.gold
        : colors.negative;

  const spreadColor =
    entry.spreadQuality === 'Excellent' || entry.spreadQuality === 'Good'
      ? colors.positive
      : colors.negative;

  const borderColor = isBest ? colors.gold : colors.border;
  const bgTint = isBest ? `${colors.gold}10` : undefined;

  return (
    <Card
      style={[
        styles.card,
        {
          borderColor,
          borderWidth: isBest ? 2 : 1,
          backgroundColor: bgTint,
        },
      ]}
    >
      {/* Best strike banner */}
      {isBest && (
        <View style={[styles.bestBanner, { backgroundColor: colors.gold }]}>
          <Text style={styles.bestBannerText}>BEST STRIKE</Text>
        </View>
      )}

      {/* Row 1: Strike price + star rating */}
      <View style={styles.row}>
        <Text style={[styles.strikePrice, { color: colors.textHeading }]}>
          {formatDollar(entry.strike)}
        </Text>
        <StarRating score={stars} size={14} />
      </View>

      {/* Row 2: OTM percentage */}
      <Text style={[styles.otmLabel, { color: colors.textMuted }]}>
        {entry.otmPct >= 0 ? '-' : '+'}
        {Math.abs(entry.otmPct).toFixed(1)}% OTM
      </Text>

      {/* Row 3: Bid / Ask / Spread */}
      <View style={styles.bidAskRow}>
        <View style={styles.bidAskItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Bid</Text>
          <Text style={[styles.metricValue, { color: colors.textHeading }]}>
            {formatDollar(entry.bid)}
          </Text>
        </View>
        <View style={styles.bidAskItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Ask</Text>
          <Text style={[styles.metricValue, { color: colors.textHeading }]}>
            {formatDollar(entry.ask)}
          </Text>
        </View>
        <View style={styles.bidAskItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Spread</Text>
          <Text style={[styles.metricValue, { color: spreadColor }]}>
            {entry.spreadPct.toFixed(1)}% {entry.spreadQuality}
          </Text>
        </View>
      </View>

      {/* Row 4: IV / POP / Annualized boxes */}
      <View style={styles.boxRow}>
        <View style={[styles.metricBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.boxLabel, { color: colors.textMuted }]}>IV</Text>
          <Text style={[styles.boxValue, { color: colors.gold }]}>{entry.iv.toFixed(1)}%</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.boxLabel, { color: colors.textMuted }]}>POP</Text>
          <Text style={[styles.boxValue, { color: popColor }]}>{entry.pop.toFixed(1)}%</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.boxLabel, { color: colors.textMuted }]}>Ann</Text>
          <Text style={[styles.boxValue, { color: colors.accent }]}>{entry.annualized.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Row 5: Greeks + volume */}
      <View style={styles.greeksRow}>
        <Text style={[styles.greekText, { color: colors.textMuted }]}>
          Delta: {entry.delta.toFixed(2)}
        </Text>
        <Text style={[styles.greekText, { color: colors.textMuted }]}>
          Vol: {formatVolume(entry.volume)}
        </Text>
        <Text style={[styles.greekText, { color: colors.textMuted }]}>
          OI: {formatVolume(entry.oi)}
        </Text>
      </View>

      {/* Row 6: Action buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: isChecked ? colors.accent : colors.background,
              borderColor: isChecked ? colors.accent : colors.border,
            },
          ]}
          onPress={onToggleCompare}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.actionBtnText,
              { color: isChecked ? '#fff' : colors.textMuted },
            ]}
          >
            {isChecked ? '\u2611 Compare' : '\u2610 Compare'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={onBacktest}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionBtnText, { color: colors.accent }]}>
            {'\u25B6'} Backtest
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

/** Export for use in Matrix screen comparison logic */
export { calculateStarRating };

const styles = StyleSheet.create({
  card: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  bestBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    alignItems: 'center',
  },
  bestBannerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  strikePrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  otmLabel: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  bidAskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bidAskItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  boxRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  boxValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  greeksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  greekText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
