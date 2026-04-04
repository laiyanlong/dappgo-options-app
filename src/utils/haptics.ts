import { Platform } from 'react-native';

/**
 * Trigger a light haptic feedback on button press.
 * Gracefully falls back to no-op if expo-haptics is unavailable.
 */
export async function lightHaptic(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // expo-haptics not available — silently ignore
  }
}

/**
 * Trigger a medium haptic feedback.
 */
export async function mediumHaptic(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // silently ignore
  }
}
