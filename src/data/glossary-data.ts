/**
 * Bilingual glossary data for options trading terms.
 * Used by the Glossary screen to display terms in the user's selected language.
 */

export interface GlossaryTerm {
  id: string;
  en: { term: string; definition: string };
  zh: { term: string; definition: string };
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'atm',
    en: { term: 'ATM (At The Money)', definition: 'Strike price equals current stock price' },
    zh: { term: 'ATM（價平）', definition: '履約價等於目前股價' },
  },
  {
    id: 'bid_ask',
    en: { term: 'Bid / Ask', definition: 'The price buyers offer / sellers want' },
    zh: { term: '買價 / 賣價', definition: '買方出價 / 賣方要價' },
  },
  {
    id: 'call',
    en: { term: 'Call Option', definition: 'Right to buy stock at strike price before expiry' },
    zh: { term: '買權（Call）', definition: '在到期前以履約價買入股票的權利' },
  },
  {
    id: 'cp_score',
    en: { term: 'CP Score', definition: 'Our composite score ranking trades by risk-adjusted value' },
    zh: { term: 'CP 評分', definition: '我們的綜合評分，依風險調整後的價值排名交易' },
  },
  {
    id: 'delta',
    en: { term: 'Delta', definition: 'How much option price changes per $1 stock move' },
    zh: { term: 'Delta（δ）', definition: '股價每變動 $1，選擇權價格的變動量' },
  },
  {
    id: 'dte',
    en: { term: 'DTE (Days to Expiry)', definition: 'Trading days until option expires' },
    zh: { term: 'DTE（到期天數）', definition: '距離選擇權到期的交易日數' },
  },
  {
    id: 'expected_move',
    en: { term: 'Expected Move', definition: 'How much the market expects stock will move by expiry' },
    zh: { term: '預期波動', definition: '市場預期股價在到期前的波動幅度' },
  },
  {
    id: 'gamma',
    en: { term: 'Gamma', definition: 'Rate of change of delta — how fast delta accelerates' },
    zh: { term: 'Gamma（γ）', definition: 'Delta 的變化速率 — Delta 加速的快慢' },
  },
  {
    id: 'gex',
    en: { term: 'GEX (Gamma Exposure)', definition: 'Dealer hedging pressure creating support/resistance levels' },
    zh: { term: 'GEX（伽瑪曝險）', definition: '做市商避險壓力形成的支撐/壓力位' },
  },
  {
    id: 'greeks',
    en: { term: 'Greeks', definition: 'Delta, Gamma, Theta, Vega — measures of option sensitivity' },
    zh: { term: '希臘字母', definition: 'Delta、Gamma、Theta、Vega — 選擇權敏感度指標' },
  },
  {
    id: 'iv',
    en: { term: 'Implied Volatility (IV)', definition: "Market's expectation of future stock volatility" },
    zh: { term: '隱含波動率（IV）', definition: '市場對未來股價波動的預期' },
  },
  {
    id: 'iron_condor',
    en: { term: 'Iron Condor', definition: 'Sell put + call spreads to profit from range-bound stock' },
    zh: { term: '鐵兀鷹（Iron Condor）', definition: '同時賣出看跌和看漲價差，從區間盤整中獲利' },
  },
  {
    id: 'iv_rank',
    en: { term: 'IV Rank', definition: 'Current IV vs its 52-week range (0-100%). High = expensive options' },
    zh: { term: 'IV Rank（波動率排名）', definition: '當前 IV 對比 52 週範圍（0-100%）。高 = 選擇權較貴' },
  },
  {
    id: 'max_pain',
    en: { term: 'Max Pain', definition: 'Strike price where option sellers profit the most at expiry' },
    zh: { term: 'Max Pain（最大痛點）', definition: '到期時選擇權賣方獲利最多的履約價' },
  },
  {
    id: 'otm',
    en: { term: 'OTM (Out of The Money)', definition: 'Put below stock price / Call above stock price — no intrinsic value' },
    zh: { term: 'OTM（價外）', definition: '看跌低於股價 / 看漲高於股價 — 無內在價值' },
  },
  {
    id: 'pc_ratio',
    en: { term: 'Put/Call Ratio', definition: 'Put volume vs call volume — shows market sentiment' },
    zh: { term: 'Put/Call 比率', definition: '看跌量 vs 看漲量 — 顯示市場情緒' },
  },
  {
    id: 'pop',
    en: { term: 'POP (Probability of Profit)', definition: 'Chance of keeping premium when selling options' },
    zh: { term: 'POP（獲利機率）', definition: '賣出選擇權時保留權利金的機率' },
  },
  {
    id: 'premium',
    en: { term: 'Premium', definition: 'Price paid or received for an option contract' },
    zh: { term: '權利金（Premium）', definition: '買賣選擇權合約所支付或收取的價格' },
  },
  {
    id: 'sell_call',
    en: { term: 'Sell Call', definition: 'Sell the right for someone to buy — bearish strategy, collect premium' },
    zh: { term: '賣出買權（Sell Call）', definition: '賣出他人買入的權利 — 看空策略，收取權利金' },
  },
  {
    id: 'sell_put',
    en: { term: 'Sell Put', definition: 'Sell the right for someone to sell — bullish strategy, collect premium' },
    zh: { term: '賣出賣權（Sell Put）', definition: '賣出他人賣出的權利 — 看多策略，收取權利金' },
  },
  {
    id: 'spread',
    en: { term: 'Spread (Bid-Ask)', definition: 'Difference between bid and ask price — tighter is better for trading' },
    zh: { term: '價差（Bid-Ask Spread）', definition: '買價和賣價的差距 — 越小對交易越有利' },
  },
  {
    id: 'strike',
    en: { term: 'Strike Price', definition: 'The price at which option can be exercised' },
    zh: { term: '履約價（Strike Price）', definition: '選擇權可以被執行的價格' },
  },
  {
    id: 'theta',
    en: { term: 'Theta', definition: 'How much value option loses per day — time decay benefits sellers' },
    zh: { term: 'Theta（θ）', definition: '選擇權每天損失的價值 — 時間衰減對賣方有利' },
  },
  {
    id: 'vega',
    en: { term: 'Vega', definition: 'How much option price changes per 1% IV change' },
    zh: { term: 'Vega（ν）', definition: '隱含波動率每變動 1%，選擇權價格的變動量' },
  },
  {
    id: 'wheel',
    en: { term: 'Wheel Strategy', definition: 'Sell put → get assigned → sell call → repeat for steady income' },
    zh: { term: '轉輪策略（Wheel）', definition: '賣 Put → 被指派 → 賣 Call → 重複循環以穩定收益' },
  },
];
