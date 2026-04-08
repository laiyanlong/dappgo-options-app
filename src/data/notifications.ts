/**
 * Notification helpers — graceful fallback when native module unavailable.
 * expo-notifications requires native build with the module linked.
 * On Debug builds without it, all functions silently no-op.
 */

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Native module not available — all functions will no-op
}

const DAILY_REMINDER_ID = 'dappgo-daily-reminder';

export async function requestPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleDailyReminder(hour: number = 9, minute: number = 0): Promise<void> {
  if (!Notifications) return;
  try {
    await cancelDailyReminder();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Options Report Ready',
        body: "New daily options report available! Check today's best trades.",
      },
      trigger: {
        type: 'daily',
        hour,
        minute,
      },
      identifier: DAILY_REMINDER_ID,
    });
  } catch {
    // Silently fail
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    // Silently fail
  }
}
