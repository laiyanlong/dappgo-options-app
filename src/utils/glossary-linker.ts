import { GLOSSARY_TERMS, type GlossaryTerm } from '../data/glossary-data';

export interface GlossaryMatch {
  term: string;
  definition: string;
  start: number;
  end: number;
  id: string;
}

/**
 * Find glossary terms in text and return their positions.
 * Used to highlight terms in report content.
 *
 * For English, matching is case-insensitive.
 * For Chinese, matching is exact.
 * Only the first occurrence of each term is returned.
 */
export function findGlossaryTerms(
  text: string,
  lang: 'en' | 'zh',
): GlossaryMatch[] {
  if (!text) return [];

  const matches: GlossaryMatch[] = [];
  const seen = new Set<string>();
  const searchText = lang === 'en' ? text.toLowerCase() : text;

  for (const entry of GLOSSARY_TERMS) {
    const termData = entry[lang];
    const termText = termData.term;
    const searchTerm = lang === 'en' ? termText.toLowerCase() : termText;

    const idx = searchText.indexOf(searchTerm);
    if (idx >= 0 && !seen.has(entry.id)) {
      seen.add(entry.id);
      matches.push({
        term: termData.term,
        definition: termData.definition,
        start: idx,
        end: idx + termText.length,
        id: entry.id,
      });
    }

    // Also try matching the short form (e.g., "IV" from "Implied Volatility (IV)")
    if (lang === 'en') {
      const parenMatch = termText.match(/\(([^)]+)\)/);
      if (parenMatch) {
        const shortForm = parenMatch[1].toLowerCase();
        // Only match short forms that are at least 2 chars to avoid false positives
        if (shortForm.length >= 2 && !seen.has(entry.id)) {
          const shortIdx = searchText.indexOf(shortForm);
          if (shortIdx >= 0) {
            seen.add(entry.id);
            matches.push({
              term: termData.term,
              definition: termData.definition,
              start: shortIdx,
              end: shortIdx + parenMatch[1].length,
              id: entry.id,
            });
          }
        }
      }
    }
  }

  // Sort by position in text
  matches.sort((a, b) => a.start - b.start);
  return matches;
}
