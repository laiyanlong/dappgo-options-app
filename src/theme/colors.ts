export const darkColors = {
  // Backgrounds — deeper, richer blacks with slight blue undertone
  background: '#0c0c1d',      // nearly black with blue tint
  backgroundAlt: '#131328',    // slightly lighter for layered cards
  card: '#171733',             // glass-like card background
  cardHover: '#1e1e45',        // subtle hover state

  // Text — crisp hierarchy
  text: '#c8cad0',             // body text, slightly warm gray
  textMuted: '#6b7084',        // secondary text
  textHeading: '#f0f1f5',      // near-white headings

  // Brand accents
  accent: '#5b6cf7',           // refined indigo (less saturated than before)
  accentDark: '#4855d4',
  gold: '#e8b84b',             // warmer, more luxurious gold

  // Semantic colors — financial standard
  positive: '#00c087',         // teal-green (easier on eyes than neon)
  negative: '#ff4757',         // soft coral-red (not harsh)

  // Structure
  border: '#232345',           // subtle borders
  borderHover: '#5b6cf7',
  navBg: 'rgba(12, 12, 29, 0.92)',
  tabBar: '#08081a',           // darkest element
  tabInactive: '#4a4b5c',
};

export const lightColors = {
  background: '#f5f6fa',
  backgroundAlt: '#ffffff',
  card: '#ffffff',
  cardHover: '#f0f2ff',
  text: '#2d3142',
  textMuted: '#7c7f8e',
  textHeading: '#1a1d2e',
  accent: '#4f5bd5',
  accentDark: '#3d47b0',
  gold: '#c49b2a',
  positive: '#00a76f',
  negative: '#e53e3e',
  border: '#e4e6ee',
  borderHover: '#4f5bd5',
  navBg: 'rgba(245, 246, 250, 0.92)',
  tabBar: '#ffffff',
  tabInactive: '#a0a3b1',
};

export type ColorScheme = typeof darkColors;
