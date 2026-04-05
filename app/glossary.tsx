import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme';

interface Term {
  title: string;
  definition: string;
}

const TERMS: Term[] = [
  { title: 'ATM (At The Money)', definition: 'Strike price equals current stock price.' },
  { title: 'Bid/Ask', definition: 'The price buyers offer / sellers want for an option contract.' },
  { title: 'Call Option', definition: 'Right to buy stock at the strike price before expiration.' },
  { title: 'CP Score', definition: 'Our composite score ranking trades by overall value.' },
  { title: 'Delta', definition: 'How much the option price moves per $1 stock move.' },
  { title: 'DTE (Days to Expiry)', definition: 'Trading days remaining until the option expires.' },
  { title: 'Expected Move', definition: 'How much the market thinks the stock will move by expiration.' },
  { title: 'GEX (Gamma Exposure)', definition: 'Dealer hedging pressure at each strike price level.' },
  { title: 'Greeks', definition: 'Delta, Gamma, Theta, Vega \u2014 measures of option price sensitivity.' },
  { title: 'Implied Volatility (IV)', definition: "Market's expected future volatility priced into options." },
  { title: 'Iron Condor', definition: 'Sell put + call spreads simultaneously for range-bound income.' },
  { title: 'IV Rank', definition: 'Current IV compared to its 52-week range, from 0\u2013100%.' },
  { title: 'Max Pain', definition: 'The strike price where option sellers profit the most at expiry.' },
  { title: 'OTM (Out of The Money)', definition: 'Put below / Call above current stock price. No intrinsic value.' },
  { title: 'P/C Ratio', definition: 'Put vs Call volume ratio, shows overall market sentiment.' },
  { title: 'POP (Probability of Profit)', definition: 'The statistical chance of keeping your premium.' },
  { title: 'Premium', definition: 'Price paid or received for an option contract.' },
  { title: 'Sell Call', definition: 'Sell the right to buy \u2014 a bearish or neutral strategy.' },
  { title: 'Sell Put', definition: 'Sell the right to sell \u2014 a bullish strategy to collect premium.' },
  { title: 'Spread', definition: 'Difference between the bid and ask price of an option.' },
  { title: 'Strike Price', definition: 'The price at which the option can be exercised.' },
  { title: 'Theta', definition: 'How much value an option loses per day from time decay.' },
  { title: 'Vega', definition: 'How much the option price changes per 1% change in IV.' },
  { title: 'Wheel Strategy', definition: 'Sell put \u2192 get assigned \u2192 sell call \u2192 repeat. Income cycle.' },
];

/**
 * Group terms into alphabetical sections.
 */
function buildSections(terms: Term[]) {
  const map = new Map<string, Term[]>();
  for (const term of terms) {
    const letter = term.title[0].toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(term);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, data]) => ({ title: letter, data }));
}

export default function GlossaryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return TERMS;
    const q = query.toLowerCase();
    return TERMS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q)
    );
  }, [query]);

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textHeading }]}>Glossary</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search terms..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Terms list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.title}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionLetter, { color: colors.gold }]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.termRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.termTitle, { color: colors.textHeading }]}>{item.title}</Text>
            <Text style={[styles.termDef, { color: colors.textMuted }]}>{item.definition}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No matching terms</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  searchWrap: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionLetter: {
    fontSize: 14,
    fontWeight: '700',
  },
  termRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  termTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  termDef: {
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 40,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
