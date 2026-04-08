import { useSettingsStore } from '../store/settings-store';

type Lang = 'en' | 'zh';

const strings: Record<string, Record<Lang, string>> = {
  // Tab labels (short form for bottom tab bar)
  'tab.dashboard': { en: 'Dashboard', zh: '儀表板' },
  'tab.reports': { en: 'Reports', zh: '報告' },
  'tab.backtest': { en: 'Backtest', zh: '回測' },
  'tab.matrix': { en: 'Matrix', zh: '矩陣' },
  'tab.settings': { en: 'Settings', zh: '設定' },

  // Dashboard
  'dashboard.title': { en: 'Dashboard', zh: '儀表板' },
  'dashboard.subtitle': { en: 'Live market data & model verdict', zh: '即時市場數據與模型評價' },
  'dashboard.livePrices': { en: 'Live Prices', zh: '即時股價' },
  'dashboard.marketSummary': { en: 'Market Summary', zh: '市場摘要' },
  'dashboard.bestTime': { en: 'Best Time to Trade', zh: '最佳交易時機' },
  'dashboard.watchlist': { en: 'Watchlist', zh: '觀察清單' },
  'dashboard.topPicks': { en: "Today's Top Picks", zh: '今日精選' },
  'dashboard.dataUpdated': { en: 'Data updated', zh: '數據已更新' },
  'dashboard.loading': { en: 'Loading market data...', zh: '載入市場數據...' },
  'dashboard.welcome': { en: 'Welcome to DappGo Options', zh: '歡迎使用 DappGo 選擇權' },
  'dashboard.pullDown': { en: 'Pull down to load market data', zh: '下拉載入市場數據' },
  'dashboard.loadData': { en: 'Load Data', zh: '載入數據' },
  'dashboard.chart': { en: 'Chart', zh: '圖表' },
  'dashboard.marketOpen': { en: 'Open', zh: '開盤' },
  'dashboard.marketClosed': { en: 'Closed', zh: '休市' },

  // Reports
  'reports.title': { en: 'Reports', zh: '報告' },
  'reports.count': { en: 'reports', zh: '份報告' },
  'reports.search': { en: 'Search reports...', zh: '搜尋報告...' },
  'reports.all': { en: 'All', zh: '全部' },
  'reports.week': { en: 'Week', zh: '本週' },
  'reports.month': { en: 'Month', zh: '本月' },
  'reports.loading': { en: 'Loading reports...', zh: '載入報告...' },
  'reports.loadingHint': { en: 'Fetching daily options analysis', zh: '取得每日選擇權分析' },
  'reports.openFull': { en: 'Open Full Report', zh: '開啟完整報告' },
  'reports.loadingData': { en: 'Loading report data...', zh: '載入報告數據...' },
  'reports.noReports': { en: 'No reports found', zh: '找不到報告' },
  'reports.noReportsHint': { en: 'Try adjusting your filters or pull down to refresh', zh: '嘗試調整篩選條件或下拉重新整理' },

  // Backtest
  'backtest.title': { en: 'Backtest', zh: '回測' },
  'backtest.subtitle': { en: 'Validate strategies with historical simulation', zh: '使用歷史模擬驗證策略' },
  'backtest.simple': { en: 'Simple', zh: '簡易' },
  'backtest.advanced': { en: 'Advanced', zh: '進階' },
  'backtest.run': { en: 'Run Backtest', zh: '執行回測' },
  'backtest.history': { en: 'History', zh: '歷史記錄' },
  'backtest.computing': { en: 'Computing...', zh: '計算中...' },
  'backtest.compareAll': { en: 'Compare All', zh: '全部比較' },
  'backtest.addPosition': { en: '+ Add Position', zh: '+ 新增部位' },
  'backtest.saveToHistory': { en: 'Save to History', zh: '儲存至歷史' },
  'backtest.shareResults': { en: 'Share Results', zh: '分享結果' },
  'backtest.exportCsv': { en: 'Export CSV', zh: '匯出 CSV' },
  'backtest.results': { en: 'Results', zh: '結果' },
  'backtest.simNote': { en: 'Using simulated prices. Real historical data coming soon.', zh: '使用模擬價格。真實歷史數據即將推出。' },
  'backtest.firstRun': { en: 'Run Your First Backtest', zh: '執行你的第一次回測' },
  'backtest.firstRunHint': { en: 'Choose a ticker and strategy above,\nthen tap "Run Backtest" to see results.\n\nTip: Start with TSLA Sell Put 5% OTM\nfor the most liquid options.', zh: '在上方選擇標的和策略，\n然後點擊「執行回測」查看結果。\n\n提示：從 TSLA Sell Put 5% OTM 開始\n流動性最佳的選擇權。' },

  // Matrix
  'matrix.title': { en: 'Options Matrix', zh: '選擇權矩陣' },
  'matrix.tabLabel': { en: 'Matrix', zh: '矩陣' },
  'matrix.subtitle': { en: 'Strike comparison & analysis', zh: '履約價比較與分析' },
  'matrix.strikes': { en: 'strikes', zh: '個履約價' },
  'matrix.best': { en: 'Best', zh: '最佳' },
  'matrix.compare': { en: 'Compare', zh: '比較' },
  'matrix.compareInBacktest': { en: 'Compare in Backtest', zh: '在回測中比較' },
  'matrix.noMatrixData': { en: 'No Matrix Data', zh: '無矩陣數據' },
  'matrix.loadingOptions': { en: 'Loading Options Data...', zh: '載入選擇權數據...' },
  'matrix.loadingHint': { en: 'Fetching live options chains\nfrom the market.', zh: '正在從市場取得\n即時選擇權鏈。' },
  'matrix.clearAll': { en: 'Clear All', zh: '全部清除' },

  // Settings
  'settings.title': { en: 'Settings', zh: '設定' },
  'settings.profile': { en: 'PROFILE', zh: '個人資料' },
  'settings.tickers': { en: 'TICKERS', zh: '追蹤標的' },
  'settings.apiKeys': { en: 'API KEYS', zh: 'API 金鑰' },
  'settings.appearance': { en: 'APPEARANCE', zh: '外觀' },
  'settings.theme': { en: 'Theme', zh: '主題' },
  'settings.language': { en: 'Language', zh: '語言' },
  'settings.notifications': { en: 'NOTIFICATIONS', zh: '通知' },
  'settings.about': { en: 'ABOUT', zh: '關於' },
  'settings.data': { en: 'DATA', zh: '數據' },
  'settings.feedback': { en: 'Send Feedback', zh: '發送回饋' },
  'settings.resetAll': { en: 'Reset All Data', zh: '重置所有數據' },
  'settings.clearCache': { en: 'Clear Cache', zh: '清除快取' },
  'settings.exportAll': { en: 'Export All Data', zh: '匯出所有數據' },
  'settings.exportWatchlist': { en: 'Export Watchlist', zh: '匯出觀察清單' },
  'settings.importWatchlist': { en: 'Import Watchlist', zh: '匯入觀察清單' },

  // Report Detail
  'report.overview': { en: 'Overview', zh: '概覽' },
  'report.options': { en: 'Options', zh: '選擇權' },
  'report.strategy': { en: 'Strategy', zh: '策略' },
  'report.model': { en: 'Model', zh: '模型' },
  'report.ai': { en: 'AI', zh: 'AI' },
  'report.addBacktest': { en: '+ Add to Backtest', zh: '+ 加入回測' },
  'report.copy': { en: 'Copy', zh: '複製' },
  'report.share': { en: 'Share', zh: '分享' },
  'report.link': { en: 'Link', zh: '連結' },
  'report.back': { en: 'Back', zh: '返回' },
  'report.termsFound': { en: 'terms explained', zh: '個術語解釋' },
  'report.loading': { en: 'Loading report...', zh: '載入報告...' },
  'report.copied': { en: 'Copied', zh: '已複製' },
  'report.copiedMsg': { en: 'Report summary copied to clipboard.', zh: '報告摘要已複製到剪貼簿。' },
  'report.noData': { en: 'data available', zh: '數據可用' },

  // Onboarding
  'onboarding.analyze': { en: 'Analyze Options', zh: '分析選擇權' },
  'onboarding.analyzeDesc': { en: 'Get daily AI-powered options analysis\nfor TSLA, AMZN, NVDA', zh: '取得每日 AI 驅動的選擇權分析\n支援 TSLA、AMZN、NVDA' },
  'onboarding.compare': { en: 'Compare Strikes', zh: '比較履約價' },
  'onboarding.compareDesc': { en: 'Compare different strikes side-by-side\nwith POP, IV, and star ratings', zh: '並排比較不同履約價\n含 POP、IV 和星級評分' },
  'onboarding.backtest': { en: 'Backtest Strategies', zh: '回測策略' },
  'onboarding.backtestDesc': { en: 'Validate your strategies against\nhistorical data before trading', zh: '在交易前用歷史數據\n驗證你的策略' },
  'onboarding.getStarted': { en: 'Get Started', zh: '開始使用' },
  'onboarding.getStartedDesc': { en: 'Your AI-powered options analyzer\nis ready to go', zh: '你的 AI 選擇權分析工具\n已準備就緒' },
  'onboarding.start': { en: 'Start Analyzing', zh: '開始分析' },
  'onboarding.skip': { en: 'Skip', zh: '跳過' },
  'onboarding.next': { en: 'Next', zh: '下一步' },

  // Strategies
  'strategy.sellPut': { en: 'Sell Put', zh: '賣 Put' },
  'strategy.sellCall': { en: 'Sell Call', zh: '賣 Call' },
  'strategy.ironCondor': { en: 'Iron Condor', zh: '鐵兀鷹' },
  'strategy.bullPutSpread': { en: 'Bull Put Spread', zh: '牛市 Put 價差' },

  // Common
  'common.loading': { en: 'Loading...', zh: '載入中...' },
  'common.retry': { en: 'Retry', zh: '重試' },
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.confirm': { en: 'Confirm', zh: '確認' },
  'common.delete': { en: 'Delete', zh: '刪除' },
  'common.save': { en: 'Save', zh: '儲存' },
  'common.backtest': { en: 'Backtest', zh: '回測' },
  'common.report': { en: 'Report', zh: '報告' },
  'common.offline': { en: 'Offline — showing cached data', zh: '離線中 — 顯示快取數據' },
  'common.rateLimited': { en: 'API rate limited. Try again in a few minutes.', zh: 'API 請求次數超過限制，請稍後再試。' },
};

/**
 * Get translated string for current language.
 */
export function t(key: string): string {
  const lang = useSettingsStore.getState().language;
  return strings[key]?.[lang] ?? strings[key]?.en ?? key;
}

/**
 * Hook version for use in components (reactive to language changes).
 */
export function useT() {
  const lang = useSettingsStore((s) => s.language);
  return (key: string): string => strings[key]?.[lang] ?? strings[key]?.en ?? key;
}
