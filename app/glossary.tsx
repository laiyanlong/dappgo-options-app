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
import { useSettingsStore } from '../src/store/settings-store';
import { GLOSSARY_TERMS, type GlossaryTerm } from '../src/data/glossary-data';

interface DisplayTerm {
  id: string;
  title: string;
  definition: string;
}

/**
 * Map a GlossaryTerm to display form based on current language.
 */
function toDisplayTerm(term: GlossaryTerm, lang: 'en' | 'zh'): DisplayTerm {
  const loc = term[lang];
  return { id: term.id, title: loc.term, definition: loc.definition };
}

/**
 * Group terms into alphabetical sections.
 */
function buildSections(terms: DisplayTerm[]) {
  const map = new Map<string, DisplayTerm[]>();
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
  const language = useSettingsStore((s) => s.language);
  const [query, setQuery] = useState('');

  const pageTitle = language === 'zh' ? '術語表' : 'Glossary';
  const searchPlaceholder = language === 'zh' ? '搜尋術語...' : 'Search terms...';
  const emptyText = language === 'zh' ? '沒有符合的術語' : 'No matching terms';

  const displayTerms = useMemo(
    () => GLOSSARY_TERMS.map((t) => toDisplayTerm(t, language)),
    [language],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return displayTerms;
    const q = query.toLowerCase();
    // Search across both languages for better discoverability
    return GLOSSARY_TERMS.filter(
      (t) =>
        t.en.term.toLowerCase().includes(q) ||
        t.en.definition.toLowerCase().includes(q) ||
        t.zh.term.toLowerCase().includes(q) ||
        t.zh.definition.toLowerCase().includes(q)
    ).map((t) => toDisplayTerm(t, language));
  }, [query, language, displayTerms]);

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textHeading }]}>{pageTitle}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={searchPlaceholder}
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
        keyExtractor={(item) => item.id}
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
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{emptyText}</Text>
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
