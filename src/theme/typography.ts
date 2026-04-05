/**
 * Typography scale - standardized across the entire app.
 * Follows Apple Human Interface Guidelines minimum readable sizes.
 *
 * Page title:    30pt bold  (was 28)
 * Section header: 20pt semibold (was 18)
 * Card title:    17pt bold  (was 16)
 * Body:          16pt regular (Apple default body size)
 * Body small:    14pt regular (was 13)
 * Caption:       13pt medium  (was 12)
 * Small:         12pt         (was 11)
 * Mono:          SpaceMono for financial numbers
 * monoLarge:     18pt         (was 16)
 * monoHero:      28pt         (was 24)
 * label:         11pt         (was 10)
 */
export const typography = {
  h1: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  cardTitle: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '500' as const, letterSpacing: 0.3 },
  small: { fontSize: 12, fontWeight: '400' as const },
  // Monospace for financial numbers — critical for alignment
  mono: { fontSize: 14, fontFamily: 'SpaceMono' as const, letterSpacing: 0 },
  monoLarge: { fontSize: 18, fontFamily: 'SpaceMono' as const, fontWeight: '700' as const },
  monoHero: { fontSize: 28, fontFamily: 'SpaceMono' as const, fontWeight: '700' as const },
  // Labels — uppercase tracking
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  tabLabel: { fontSize: 11, fontWeight: '600' as const },
};
