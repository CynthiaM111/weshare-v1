/**
 * NotificationBell — persistent floating bell rendered above every tab screen.
 * Navigates to /notifications and shows an unread-count badge.
 */

import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSession } from '@/hooks/use-session';
import { getUnreadCount } from '@/lib/notifications';

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
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

  // Refresh on mount, whenever the route changes, and on app foreground.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Hide for guests and on the notifications screen itself.
  if (!session) return null;
  if (pathname === '/notifications') return null;

  return (
    <Pressable
      onPress={() => router.push('/notifications' as any)}
      style={[styles.bellFab, { top: insets.top + 12 }]}
      hitSlop={8}
    >
      <IconSymbol name="bell.fill" size={20} color="#FFFFFF" />
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

const styles = StyleSheet.create({
  bellFab: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
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
