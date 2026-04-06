import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Card } from '../ui/Card';
import { StarRating } from '../ui/StarRating';
import { InfoTooltip } from '../ui/InfoTooltip';
import { formatDollar, formatVolume } from '../../utils/format';
import { useWatchlistStore } from '../../store/watchlist-store';
import { useCompareStore } from '../../store/compare-store';
import { useSettingsStore } from '../../store/settings-store';
import { trackEvent } from '../../data/analytics';
import type { OptionEntry } from '../../utils/types';

interface StrikeCardProps {
  /** The option entry data to display */
  entry: OptionEntry;
  /** Current stock price (for OTM % display) */
  currentPrice: number;
  /** Whether this strike is the best overall pick */
  isBest: boolean;
  /** Whether this card is checked for compare mode (legacy — ignored, uses compare-store) */
  isChecked?: boolean;
  /** Toggle compare checkbox (legacy — ignored, uses compare-store) */
  onToggleCompare?: () => void;
  /** Navigate to backtest for this strike */
  onBacktest: () => void;
  /** Ticker symbol for watchlist (e.g. 'TSLA') */
  symbol?: string;
  /** Strategy label for watchlist (e.g. 'sell_put') */
  strategy?: string;
  /** Expiry date string for watchlist */
  expiry?: string;
  /** DTE for compare item */
  dte?: number;
  /** Compact 2-row layout for narrow screens */
  compact?: boolean;
}

/**
 * Calculate a star rating (0-5) based on POP, annualized return, and spread quality.
 * Weights: POP 40%, annualized 35%, spread 25%.
 */
function calculateStarRating(entry: OptionEntry): number {
  // POP score: 0-5 scale (50% => 2.5, 80% => 4, 90% => 4.5)
  const popScore = Math.min(5, ((entry.pop ?? 0) / 100) * 5);

  // Annualized score: 0-5 scale (cap at 100%)
  const annScore = Math.min(5, ((entry.annualized ?? 0) / 100) * 5);

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
 * Wrapped with React.memo to prevent unnecessary re-renders in list.
 */
export const StrikeCard = React.memo(function StrikeCard({
  entry,
  currentPrice,
  isBest,
  onBacktest,
  symbol = '',
  strategy = 'sell_put',
  expiry = '',
  dte = 0,
  compact = false,
}: StrikeCardProps) {
  const { colors } = useTheme();
  const stars = calculateStarRating(entry);

  // Heart pulse animation
  const heartScale = useRef(new Animated.Value(1)).current;

  // Watchlist tip state
  const [showWatchlistTip, setShowWatchlistTip] = useState(false);
  const hasSeenWatchlistTip = useSettingsStore((s) => s.hasSeenWatchlistTip);
  const setHasSeenWatchlistTip = useSettingsStore((s) => s.setHasSeenWatchlistTip);

  // Compare store integration
  const isInCompare = useCompareStore((s) =>
    s.items.some((i) => i.symbol === symbol && i.strike === entry.strike)
  );
  const addItem = useCompareStore((s) => s.addItem);
  const removeItem = useCompareStore((s) => s.removeItem);

  const toggleCompare = () => {
    if (isInCompare) {
      removeItem(symbol, entry.strike);
    } else {
      trackEvent('compare_add', { symbol, strike: entry.strike });
      addItem({
        symbol,
        strike: entry.strike,
        bid: entry.bid,
        iv: entry.iv,
        pop: entry.pop,
        annualized: entry.annualized,
        delta: entry.delta,
        spreadQuality: entry.spreadQuality,
        expiry,
        dte,
      });
    }
  };

  // Watchlist integration — subscribe to items array for reactive updates
  const isInWatchlist = useWatchlistStore((s) =>
    s.items.some((it) => it.symbol === symbol && it.strike === entry.strike)
  );
  const addWatchItem = useWatchlistStore((s) => s.addItem);
  const removeByKey = useWatchlistStore((s) => s.removeByKey);

  const toggleWatchlist = () => {
    // Pulse animation
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();

    if (isInWatchlist) {
      removeByKey(symbol, entry.strike);
    } else {
      trackEvent('watchlist_add', { symbol, strike: entry.strike });
      addWatchItem({ symbol, strategy, strike: entry.strike, expiry });
      // Show first-time tooltip
      if (!hasSeenWatchlistTip) {
        setShowWatchlistTip(true);
        setHasSeenWatchlistTip(true);
        setTimeout(() => setShowWatchlistTip(false), 3000);
      }
    }
  };

  // Auto-dismiss watchlist tip
  useEffect(() => {
    if (showWatchlistTip) {
      const timer = setTimeout(() => setShowWatchlistTip(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showWatchlistTip]);

  // Color helpers
  const popColor =
    (entry.pop ?? 0) >= 70
      ? colors.positive
      : (entry.pop ?? 0) >= 50
        ? colors.gold
        : colors.negative;

  const spreadColor =
    entry.spreadQuality === 'Excellent' || entry.spreadQuality === 'Good'
      ? colors.positive
      : colors.negative;

  const borderColor = isBest ? colors.gold : colors.border;
  const bgTint = isBest ? `${colors.gold}10` : undefined;

  // ── Compact 2-row layout for phones ──
  if (compact) {
    return (
      <Card
        style={[
          styles.card,
          compactStyles.card,
          {
            borderColor,
            borderWidth: isBest ? 2 : 1,
            backgroundColor: bgTint,
          },
        ]}
      >
        {/* Row 1: Strike, OTM, Bid, Stars, Compare toggle */}
        <View style={compactStyles.row}>
          <Text style={[compactStyles.strike, { color: colors.textHeading }]}>
            {formatDollar(entry.strike)}
          </Text>
          <Text style={[compactStyles.otm, { color: colors.textMuted }]}>
            {(entry.otmPct ?? 0) >= 0 ? '-' : '+'}
            {Math.abs(entry.otmPct ?? 0).toFixed(1)}% OTM
          </Text>
          <Text style={[compactStyles.bid, { color: colors.textHeading }]}>
            Bid {formatDollar(entry.bid)}
          </Text>
          <StarRating score={stars} size={12} />
        </View>
        {/* Row 2: IV, POP, Ann with tooltips, actions */}
        <View style={compactStyles.row}>
          <View style={compactStyles.metricRow}>
            <Text style={[compactStyles.metric, { color: colors.gold }]}>
              IV {(entry.iv ?? 0).toFixed(1)}%
            </Text>
            <InfoTooltip text="Higher IV = more premium" />
          </View>
          <View style={compactStyles.metricRow}>
            <Text style={[compactStyles.metric, { color: popColor }]}>
              POP {(entry.pop ?? 0).toFixed(1)}%
            </Text>
            <InfoTooltip text="Chance of keeping premium" />
          </View>
          <View style={compactStyles.metricRow}>
            <Text style={[compactStyles.metric, { color: colors.accent }]}>
              Ann {(entry.annualized ?? 0).toFixed(1)}%
            </Text>
            <InfoTooltip text="Annualized return if held" />
          </View>
          <View style={compactStyles.actions}>
            {/* Compare toggle */}
            <TouchableOpacity onPress={toggleCompare} activeOpacity={0.7} style={compactStyles.iconBtn}>
              <Ionicons
                name={isInCompare ? 'checkmark-circle' : 'add-circle-outline'}
                size={22}
                color={isInCompare ? colors.accent : colors.textMuted}
              />
            </TouchableOpacity>
            {symbol !== '' && (
              <TouchableOpacity onPress={toggleWatchlist} activeOpacity={0.7} style={compactStyles.iconBtn}>
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Ionicons
                    name={isInWatchlist ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isInWatchlist ? colors.negative : colors.textMuted}
                  />
                </Animated.View>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onBacktest} activeOpacity={0.7} style={compactStyles.iconBtn}>
              <Ionicons name="play" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  }

  // ── Full layout (iPad / desktop) ──
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
        {(entry.otmPct ?? 0) >= 0 ? '-' : '+'}
        {Math.abs(entry.otmPct ?? 0).toFixed(1)}% OTM
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
            {(entry.spreadPct ?? 0).toFixed(1)}% {entry.spreadQuality ?? ''}
          </Text>
        </View>
      </View>

      {/* Row 4: IV / POP / Annualized boxes with InfoTooltips */}
      <View style={styles.boxRow}>
        <View style={[styles.metricBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.boxLabelRow}>
            <Text style={[styles.boxLabel, { color: colors.textMuted }]}>IV</Text>
            <InfoTooltip text="Higher IV = more premium" />
          </View>
          <Text style={[styles.boxValue, { color: colors.gold }]}>{(entry.iv ?? 0).toFixed(1)}%</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.boxLabelRow}>
            <Text style={[styles.boxLabel, { color: colors.textMuted }]}>POP</Text>
            <InfoTooltip text="Chance of keeping premium" />
          </View>
          <Text style={[styles.boxValue, { color: popColor }]}>{(entry.pop ?? 0).toFixed(1)}%</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.boxLabelRow}>
            <Text style={[styles.boxLabel, { color: colors.textMuted }]}>Ann</Text>
            <InfoTooltip text="Annualized return if held" />
          </View>
          <Text style={[styles.boxValue, { color: colors.accent }]}>{(entry.annualized ?? 0).toFixed(1)}%</Text>
        </View>
      </View>

      {/* Row 5: Greeks + volume */}
      <View style={styles.greeksRow}>
        <Text style={[styles.greekText, { color: colors.textMuted }]}>
          Delta: {(entry.delta ?? 0).toFixed(2)}
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
        {/* Compare toggle — small icon */}
        <TouchableOpacity
          style={[
            styles.compareIconBtn,
            {
              backgroundColor: isInCompare ? colors.accent + '18' : colors.background,
              borderColor: isInCompare ? colors.accent : colors.border,
            },
          ]}
          onPress={toggleCompare}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isInCompare ? 'checkmark-circle' : 'add-circle-outline'}
            size={20}
            color={isInCompare ? colors.accent : colors.textMuted}
          />
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

        {/* Watchlist bookmark button */}
        {symbol !== '' && (
          <TouchableOpacity
            style={[
              styles.watchlistBtn,
              {
                backgroundColor: isInWatchlist ? colors.negative + '18' : colors.background,
                borderColor: isInWatchlist ? colors.negative : colors.border,
              },
            ]}
            onPress={toggleWatchlist}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isInWatchlist ? 'heart' : 'heart-outline'}
                size={22}
                color={isInWatchlist ? colors.negative : colors.textMuted}
              />
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* First-time watchlist tooltip */}
      <Modal
        visible={showWatchlistTip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWatchlistTip(false)}
      >
        <TouchableOpacity
          style={styles.tipOverlay}
          activeOpacity={1}
          onPress={() => setShowWatchlistTip(false)}
        >
          <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipText, { color: colors.textHeading }]}>
              {'\u2764\uFE0F'} Added to Watchlist!{'\n'}View your saved strikes on the Dashboard.
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </Card>
  );
});

/** Export for use in Matrix screen comparison logic */
export { calculateStarRating };

const compactStyles = StyleSheet.create({
  card: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  strike: {
    // Increased from 15 → 16pt (body size)
    fontSize: 16,
    fontWeight: '700',
    minWidth: 72,
  },
  otm: {
    // Increased from 11 → 12pt (small)
    fontSize: 12,
    minWidth: 64,
  },
  bid: {
    // Increased from 12 → 13pt (caption)
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  metric: {
    // Increased from 11 → 12pt (small)
    fontSize: 12,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 2,
  },
  iconBtn: {
    // Apple HIG minimum 44x44pt touch target
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
    fontSize: 14,
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
    fontSize: 15,
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
  boxLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  compareIconBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  watchlistBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  tipOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tipCard: {
    marginHorizontal: 40,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  tipText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
});
