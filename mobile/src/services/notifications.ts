import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Local notifications: NewsCred notifies when an analysis completes.
 *
 * IMPORTANT: expo-notifications cannot even be imported inside the
 * Expo Go preview app (SDK 53+ removed support there). So this module
 * 1) detects Expo Go and no-ops gracefully, and
 * 2) lazy-loads the library only when actually needed.
 * In a real build (APK / development build) everything works normally.
 */

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

let Notifications: any = null;
let handlerSet = false;

const getNotifications = (): any => {
  if (isExpoGo) return null;
  if (!Notifications) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Notifications = require('expo-notifications');
      if (!handlerSet) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        handlerSet = true;
      }
    } catch {
      return null;
    }
  }
  return Notifications;
};

export const notificationsEnabled = async (): Promise<boolean> =>
  (await AsyncStorage.getItem('notificationsEnabled')) === 'true';

/**
 * Ask for permission; returns whether granted.
 * In Expo Go this returns false — the Settings screen explains why.
 */
export const enableNotifications = async (): Promise<boolean> => {
  const N = getNotifications();
  if (!N) return false;
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'NewsCred',
        importance: N.AndroidImportance.DEFAULT,
      });
    }
    const { status } = await N.requestPermissionsAsync();
    const granted = status === 'granted';
    await AsyncStorage.setItem('notificationsEnabled', String(granted));
    return granted;
  } catch {
    return false;
  }
};

export const disableNotifications = async () => {
  await AsyncStorage.setItem('notificationsEnabled', 'false');
};

/** Fire a local "check complete" notification, if enabled and supported. */
export const notifyAnalysisComplete = async (title: string, score: number, verdict: string) => {
  try {
    const N = getNotifications();
    if (!N || !(await notificationsEnabled())) return;
    await N.scheduleNotificationAsync({
      content: {
        title: `Check complete — ${Math.round(score)}/100`,
        body: `"${title.slice(0, 60)}${title.length > 60 ? '…' : ''}" rated ${verdict.toLowerCase().replace(/_/g, ' ')}.`,
      },
      trigger: null,
    });
  } catch {}
};
