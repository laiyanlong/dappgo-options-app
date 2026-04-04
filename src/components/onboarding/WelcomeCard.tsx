import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSettingsStore } from '../../store/settings-store';
import { lightHaptic } from '../../utils/haptics';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Step {
  icon: IoniconsName;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: 'analytics-outline',
    title: 'Analyze',
    description: 'Browse daily options reports with AI insights',
  },
  {
    icon: 'git-compare-outline',
    title: 'Compare',
    description: 'Side-by-side strike comparison with star ratings',
  },
  {
    icon: 'trending-up-outline',
    title: 'Backtest',
    description: 'Validate strategies against historical data',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;

/**
 * Onboarding welcome card shown on first launch.
 * 3-step carousel with DappGo branding.
 */
export function WelcomeCard() {
  const { colors } = useTheme();
  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);
  const hasCompleted = useSettingsStore((s) => s.hasCompletedOnboarding);

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Step>>(null);

  if (hasCompleted) return null;

  const handleGetStarted = () => {
    lightHaptic();
    setHasCompletedOnboarding(true);
  };

  const handleNext = () => {
    if (currentIndex < STEPS.length - 1) {
      lightHaptic();
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setCurrentIndex(nextIdx);
    } else {
      handleGetStarted();
    }
  };

  const renderStep = ({ item }: ListRenderItemInfo<Step>) => (
    <View style={[styles.stepContainer, { width: CARD_WIDTH }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.accent + '22' }]}>
        <Ionicons name={item.icon} size={40} color={colors.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.textHeading }]}>
        {item.title}
      </Text>
      <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Branding */}
        <Text style={[styles.brand, { color: colors.gold }]}>DappGo</Text>
        <Text style={[styles.welcome, { color: colors.textHeading }]}>
          Welcome to Options Analyzer
        </Text>

        {/* Carousel */}
        <FlatList
          ref={flatListRef}
          data={STEPS}
          renderItem={renderStep}
          keyExtractor={(item) => item.title}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
        />

        {/* Dots */}
        <View style={styles.dots}>
          {STEPS.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    idx === currentIndex ? colors.accent : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>
            {currentIndex === STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  welcome: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  stepContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
