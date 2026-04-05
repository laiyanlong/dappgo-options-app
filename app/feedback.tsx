import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { useSettingsStore } from '../src/store/settings-store';

const CATEGORIES = ['Bug', 'Feature Request', 'UI/UX', 'Other'] as const;
type Category = (typeof CATEGORIES)[number];

/**
 * Feedback form page.
 * Users can rate the app, pick a category, write a message,
 * and submit via email using Linking.openURL(mailto:...).
 */
export default function FeedbackScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);

  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Thank-you animation
  const thankYouOpacity = useRef(new Animated.Value(0)).current;
  const thankYouScale = useRef(new Animated.Value(0.8)).current;

  const handleSubmit = () => {
    Keyboard.dismiss();

    const subject = encodeURIComponent(
      `[DappGo Feedback] ${category ?? 'General'} - ${rating} stars`
    );
    const body = encodeURIComponent(
      `Rating: ${rating}/5\nCategory: ${category ?? 'N/A'}\n\n${message}`
    );
    const mailto = `mailto:contact@dappgo.com?subject=${subject}&body=${body}`;

    Linking.openURL(mailto).catch(() => {
      // Silently fail if no email client — still show thank-you
    });

    // Show thank-you animation
    setSubmitted(true);
    Animated.parallel([
      Animated.timing(thankYouOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(thankYouScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate back after delay
    setTimeout(() => {
      router.back();
    }, 2000);
  };

  const isValid = rating > 0;

  const labels = {
    title: language === 'zh' ? '意見回饋' : 'Send Feedback',
    ratingLabel: language === 'zh' ? '整體評分' : 'Overall Rating',
    categoryLabel: language === 'zh' ? '類別' : 'Category',
    messageLabel: language === 'zh' ? '訊息' : 'Message',
    messagePlaceholder:
      language === 'zh' ? '告訴我們你的想法...' : 'Tell us what you think...',
    submit: language === 'zh' ? '送出回饋' : 'Submit Feedback',
    thankYou: language === 'zh' ? '感謝你的回饋！' : 'Thank you for your feedback!',
  };

  if (submitted) {
    return (
      <View
        style={[
          styles.container,
          styles.centeredContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <Animated.View
          style={[
            styles.thankYouContainer,
            {
              opacity: thankYouOpacity,
              transform: [{ scale: thankYouScale }],
            },
          ]}
        >
          <Text style={styles.thankYouEmoji}>{'🎉'}</Text>
          <Text style={[styles.thankYouText, { color: colors.textHeading }]}>
            {labels.thankYou}
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textHeading} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textHeading }]}>
            {labels.title}
          </Text>
        </View>

        {/* Star Rating */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {labels.ratingLabel}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
                style={styles.starBtn}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? colors.gold : colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Chips */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {labels.categoryLabel}
          </Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(isSelected ? null : cat)}
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? colors.accent
                        : colors.card,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#fff' : colors.textMuted },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Message Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {labels.messageLabel}
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                color: colors.text,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            placeholder={labels.messagePlaceholder}
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.7}
          disabled={!isValid}
          style={[
            styles.submitBtn,
            {
              backgroundColor: isValid ? colors.accent : colors.border,
            },
          ]}
        >
          <Ionicons
            name="send"
            size={18}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.submitText}>{labels.submit}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
    minHeight: 52,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  thankYouContainer: {
    alignItems: 'center',
  },
  thankYouEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  thankYouText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
});
