/**
 * Notification bell — floating on most tabs; inline in headers that have a trailing CTA.
 */

import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSession } from '@/hooks/use-session';
import { getUnreadCount } from '@/lib/notifications';

/** Screens that embed the bell in TabScreenHeader instead of the floating FAB. */
export function usesEmbeddedHeaderBell(pathname: string): boolean {
  return pathname.includes('my-rides') || pathname.includes('my-bookings');
}

export function useNotificationUnread() {
  const { session } = useSession();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!session?.userId) {
      setUnreadCount(0);
      return;
    }
    try {
      setUnreadCount(await getUnreadCount(session.userId));
    } catch {
      setUnreadCount(0);
    }
  }, [session?.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { unreadCount, session };
}

type NotificationBellButtonProps = {
  variant?: 'fab' | 'inline';
  style?: ViewStyle;
};

export function NotificationBellButton({ variant = 'fab', style }: NotificationBellButtonProps) {
  const router = useRouter();
  const { unreadCount, session } = useNotificationUnread();

  if (!session) return null;

  const isInline = variant === 'inline';

  return (
    <Pressable
      onPress={() => router.push('/notifications' as any)}
      style={[isInline ? styles.bellInline : styles.bellFab, style]}
      hitSlop={8}
    >
      <IconSymbol name="bell.fill" size={isInline ? 18 : 20} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={styles.bellBadge}>
          <ThemedText style={styles.bellBadgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/** Floating bell above tab content (hidden where the header embeds it). */
export function NotificationBell() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session } = useNotificationUnread();

  if (!session) return null;
  if (pathname === '/notifications') return null;
  if (usesEmbeddedHeaderBell(pathname)) return null;

  return (
    <NotificationBellButton
      variant="fab"
      style={{ position: 'absolute', right: 16, top: insets.top + 12, zIndex: 100 }}
    />
  );
}

const styles = StyleSheet.create({
  bellFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(8,17,31,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bellInline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(8,17,31,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', lineHeight: 13 },
}) as any;

export default NotificationBell;
