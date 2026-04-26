import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { clearSession, loadSession, type AuthSession } from '@/lib/auth/session';
import { getUserByPhone, type UserProfile } from '@/lib/auth/users';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.68)', dark: 'rgba(236,237,238,0.72)' }, 'text');

  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadSession();
      if (cancelled) return;
      setSession(s);
      if (s) {
        const p = await getUserByPhone(s.phoneE164);
        if (!cancelled) setProfile(p);
      } else {
        setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 6 }]} lightColor="transparent" darkColor="transparent">
        <View style={styles.headerBtn} />
        <View style={styles.headerCenter}>
          <LogoMark size={26} />
          <ThemedText style={[styles.headerTitle, { color: text }]}>Profile</ThemedText>
        </View>
        <View style={styles.headerBtn} />
      </ThemedView>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
        {!session ? (
          <View style={[styles.card, { backgroundColor: surface, borderColor: hairline }]}>
            <ThemedText style={[styles.title, { color: text }]}>You’re browsing as a guest</ThemedText>
            <ThemedText style={[styles.body, { color: subText }]}>
              Login to post rides and view your posted rides.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/auth', params: { redirect: '/profile' } })}
              style={[styles.primary, { backgroundColor: '#00AEEF' }]}
            >
              <ThemedText style={styles.primaryText}>Login</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: surface, borderColor: hairline }]}>
            <View style={styles.row}>
              <IconSymbol name="person.circle.fill" size={28} color={icon} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.title, { color: text }]} numberOfLines={1}>
                  {profile?.fullName ?? 'Welcome'}
                </ThemedText>
                <ThemedText style={[styles.body, { color: subText }]} numberOfLines={1}>
                  {session.phoneE164}
                </ThemedText>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/my-rides')}
              style={[styles.secondary, { borderColor: hairline }]}
            >
              <ThemedText style={[styles.secondaryText, { color: text }]}>My Rides</ThemedText>
              <IconSymbol name="chevron.right" size={18} color={icon} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                await clearSession();
                setSession(null);
                router.replace('/');
              }}
              style={[styles.secondary, { borderColor: hairline }]}
            >
              <ThemedText style={[styles.secondaryText, { color: '#EF4444' }]}>Logout</ThemedText>
              <IconSymbol name="arrow.right.square" size={18} color="#EF4444" />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: { width: 40, height: 40, borderRadius: 14 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '900' },
  container: { paddingHorizontal: 16, gap: 14 },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '900' },
  body: { fontSize: 13, lineHeight: 18, fontWeight: '700', opacity: 0.9, marginTop: 2 },
  primary: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '900' },
  secondary: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryText: { fontSize: 14, fontWeight: '900' },
});

