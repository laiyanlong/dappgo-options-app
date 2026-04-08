import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useSettingsStore } from '../../store/settings-store';
import { lightHaptic } from '../../utils/haptics';
import { useT } from '../../utils/i18n';

interface OnboardingPage {
  emoji: string;
  titleKey: string;
  subtitleKey: string;
}

const PAGE_DEFS: OnboardingPage[] = [
  {
    emoji: '\uD83D\uDCCA', // chart icon
    titleKey: 'onboarding.analyze',
    subtitleKey: 'onboarding.analyzeDesc',
  },
  {
    emoji: '\uD83D\uDCCB', // clipboard icon
    titleKey: 'onboarding.compare',
    subtitleKey: 'onboarding.compareDesc',
  },
  {
    emoji: '\uD83D\uDCC8', // chart with upward trend
    titleKey: 'onboarding.backtest',
    subtitleKey: 'onboarding.backtestDesc',
  },
  {
    emoji: '\uD83D\uDE80', // rocket
    titleKey: 'onboarding.getStarted',
    subtitleKey: 'onboarding.getStartedDesc',
  },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Full-screen onboarding experience shown on first launch.
 * 4-page horizontal swipeable with dot indicators.
 */
export function WelcomeCard() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);
  const hasCompleted = useSettingsStore((s) => s.hasCompletedOnboarding);
  const t = useT();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingPage>>(null);

  if (hasCompleted) return null;

  const handleComplete = () => {
    lightHaptic();
    setHasCompletedOnboarding(true);
  };

  const handleSkip = () => {
    lightHaptic();
    setHasCompletedOnboarding(true);
  };

  const handleNext = () => {
    if (currentIndex < PAGE_DEFS.length - 1) {
      lightHaptic();
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setCurrentIndex(nextIdx);
    }
  };

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offset / SCREEN_WIDTH);
    if (idx >= 0 && idx < PAGE_DEFS.length) {
      setCurrentIndex(idx);
    }
  }, []);

  const isLastPage = currentIndex === PAGE_DEFS.length - 1;

  const renderPage = ({ item, index }: ListRenderItemInfo<OnboardingPage>) => (
    <View style={[pageStyles.container, { width: SCREEN_WIDTH }]}>
      {/* Large emoji illustration */}
      <View style={[pageStyles.iconCircle, { backgroundColor: colors.accent + '18' }]}>
        <Text style={pageStyles.emoji}>{item.emoji}</Text>
      </View>

      {/* Title */}
      <Text style={[pageStyles.title, { color: colors.textHeading }]}>
        {t(item.titleKey)}
      </Text>

      {/* Subtitle */}
      <Text style={[pageStyles.subtitle, { color: colors.textMuted }]}>
        {t(item.subtitleKey)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      {/* Skip button — top right */}
      {!isLastPage && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 12 }]}
          onPress={handleSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.skipText, { color: colors.textMuted }]}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* Branding */}
      <View style={[styles.brandRow, { marginTop: insets.top + 60 }]}>
        <Text style={[styles.brand, { color: colors.gold }]}>DappGo</Text>
        <Text style={[styles.brandSub, { color: colors.textMuted }]}>Options Analyzer</Text>
      </View>

      {/* Swipeable pages */}
      <FlatList
        ref={flatListRef}
        data={PAGE_DEFS}
        renderItem={renderPage}
        keyExtractor={(item) => item.titleKey}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        style={styles.flatList}
        contentContainerStyle={{ alignItems: 'center' }}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {PAGE_DEFS.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                backgroundColor: idx === currentIndex ? colors.accent : colors.border,
                width: idx === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom button */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 24 }]}>
        {isLastPage ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={handleComplete}
            activeOpacity={0.7}
          >
            <Text style={styles.btnText}>{t('onboarding.start')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.btnText}>{t('onboarding.next')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const pageStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  flatList: {
    flexGrow: 0,
    flexShrink: 0,
    height: SCREEN_HEIGHT * 0.45,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomArea: {
    paddingHorizontal: 32,
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
