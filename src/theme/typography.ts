/**
 * Typography scale - standardized across the entire app.
 *
 * Page title:    28pt bold
 * Section header: 18pt semibold
 * Card title:    16pt bold
 * Body:          15pt regular
 * Body small:    13pt regular
 * Caption:       12pt medium
 * Small:         11pt
 * Mono:          SpaceMono for financial numbers
 */
export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  cardTitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.3 },
  small: { fontSize: 11, fontWeight: '400' as const },
  // Monospace for financial numbers — critical for alignment
  mono: { fontSize: 13, fontFamily: 'SpaceMono' as const, letterSpacing: 0 },
  monoLarge: { fontSize: 16, fontFamily: 'SpaceMono' as const, fontWeight: '700' as const },
  monoHero: { fontSize: 24, fontFamily: 'SpaceMono' as const, fontWeight: '700' as const },
  // Labels — uppercase tracking
  label: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  tabLabel: { fontSize: 10, fontWeight: '600' as const },
};
