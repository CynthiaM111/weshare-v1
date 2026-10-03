import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const REMINDER_MINUTES = 30;
const REMINDER_PREFIX = 'ride-reminder:';
const CHANNEL_ID = 'ride-updates';

let handlerReady = false;

function ensureHandler() {
  if (handlerReady || Platform.OS === 'web') return;
  handlerReady = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Ride updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** Asks for alert permission. Returns false on web, simulators still get local alerts when granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  ensureHandler();
  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

async function registerPushToken() {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (!token) throw new Error('Expo did not return a push token.');

  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw new Error(error.message);
}

type Reminder = {
  rideId: string;
  departAtISO: string;
  fromShort: string;
  toShort: string;
};

function reminderId(rideId: string) {
  return `${REMINDER_PREFIX}${rideId}`;
}

async function scheduleReminder(reminder: Reminder) {
  const depart = new Date(reminder.departAtISO).getTime();
  if (Number.isNaN(depart) || depart <= Date.now()) return;

  const triggerAt = depart - REMINDER_MINUTES * 60 * 1000;
  const when = new Date(Math.max(triggerAt, Date.now() + 5000));
  const soon = triggerAt <= Date.now();
  const route = `${reminder.fromShort} → ${reminder.toShort}`;

  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(reminder.rideId),
    content: {
      title: soon ? 'Your ride is soon' : 'Ride in 30 minutes',
      body: soon
        ? `${route} is coming up.`
        : `${route} leaves in 30 minutes.`,
      sound: true,
      data: { rideId: reminder.rideId, type: 'ride_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: CHANNEL_ID,
    },
  });
}

/** Replaces scheduled ride reminders with the user's upcoming passenger and driver rides. */
export async function syncRideReminders(userId: string) {
  if (Platform.OS === 'web') return;
  const allowed = await ensureNotificationPermission();
  if (!allowed) return;

  const [{ listMyBookingsWithRides }, { listMyRides }] = await Promise.all([
    import('@/lib/bookings'),
    import('@/lib/rides'),
  ]);

  const [bookings, rides] = await Promise.all([
    listMyBookingsWithRides(userId),
    listMyRides(userId),
  ]);

  const byRide = new Map<string, Reminder>();

  for (const booking of bookings) {
    const ride = booking.ride;
    if (!ride) continue;
    if (booking.status !== 'confirmed' && booking.status !== 'started') continue;
    if (ride.status === 'cancelled' || ride.status === 'completed') continue;
    byRide.set(ride.id, {
      rideId: ride.id,
      departAtISO: ride.departAtISO,
      fromShort: ride.fromShort,
      toShort: ride.toShort,
    });
  }

  for (const ride of rides) {
    if (ride.status !== 'active' && ride.status !== 'started') continue;
    byRide.set(ride.id, {
      rideId: ride.id,
      departAtISO: ride.departAtISO,
      fromShort: ride.fromShort,
      toShort: ride.toShort,
    });
  }

  const keep = new Set([...byRide.keys()].map(reminderId));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(REMINDER_PREFIX) && !keep.has(item.identifier))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );

  await Promise.all([...byRide.values()].map((reminder) => scheduleReminder(reminder)));
}

/** Registers this device and refreshes local ride reminders. Safe to call often. */
export async function syncDeviceNotifications(userId: string) {
  if (Platform.OS === 'web') return;
  try {
    const allowed = await ensureNotificationPermission();
    if (!allowed) return;
    await registerPushToken();
    await syncRideReminders(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not register this phone for notifications.';
    Alert.alert('Notifications', message);
  }
}

/** Banner on the recipient's phone for an in-app notification. No-op if they have no token. */
export async function deliverPushNotification(
  userId: string,
  title: string,
  message: string,
  data: { type?: string; rideId?: string | null; bookingId?: string | null }
) {
  try {
    await supabase.functions.invoke('send-push', {
      body: {
        userId,
        title,
        message,
        data: {
          type: data.type ?? null,
          rideId: data.rideId ?? null,
          bookingId: data.bookingId ?? null,
        },
      },
    });
  } catch {
    // In-app notification already exists.
  }
}
