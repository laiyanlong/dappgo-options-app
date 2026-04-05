/**
 * Typography scale - standardized across the entire app.
 *
 * Page title:    28pt bold
 * Section header: 18pt semibold
 * Card title:    16pt bold
 * Body:          15pt regular
 * Body small:    13pt regular
 * Caption:       12pt regular
 * Small:         11pt
 */
export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -1 },
  h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  cardTitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400' as const },
  small: { fontSize: 11, fontWeight: '400' as const },
  mono: { fontSize: 13, fontFamily: 'SpaceMono' },
  monoLarge: { fontSize: 15, fontFamily: 'SpaceMono' },
  tabLabel: { fontSize: 10, fontWeight: '600' as const },
};
