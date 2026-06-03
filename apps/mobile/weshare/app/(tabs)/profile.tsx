import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenSafeArea } from '@/components/ScreenSafeArea';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui/AuthGate';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ComponentProps } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { clearSession } from '@/lib/auth/session';
import { upsertProfile } from '@/lib/auth/users';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const DANGER = '#EF4444';

type IconName = ComponentProps<typeof IconSymbol>['name'];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase().slice(0, 2) || '?';
}

function formatPhoneDisplay(e164: string) {
  const raw = e164.trim();
  if (raw.startsWith('+250')) return `+250 ${raw.slice(4)}`;
  if (raw.startsWith('250')) return `+250 ${raw.slice(3)}`;
  return raw;
}

function MenuRow({
  icon,
  iconBg,
  iconColor,
  label,
  onPress,
  hair,
  textPri,
  textSub,
  last,
}: {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  label: string;
  onPress: () => void;
  hair: string;
  textPri: string;
  textSub: string;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuRow, !last && { borderBottomWidth: 1, borderBottomColor: hair }]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <IconSymbol name={icon} size={18} color={iconColor} />
      </View>
      <ThemedText style={[styles.menuLabel, { color: textPri }]}>{label}</ThemedText>
      <IconSymbol name="chevron.right" size={14} color={textSub} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { session, profile, refreshProfile } = useSession();

  const textPri = isDark ? '#FFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const hair = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(8,17,31,0.09)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';
  const cardBg = isDark ? NAVY_2 : '#FFF';
  const bg = isDark ? NAVY : '#F5F7FA';

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.fullName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) setName(profile?.fullName ?? '');
  }, [profile?.fullName, editing]);

  async function onSave() {
    if (!session || !name.trim()) return;
    setSaving(true);
    setError('');
    const err = await upsertProfile(session.userId, { fullName: name.trim() });
    if (err) {
      setError(err);
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  }

  async function onLogout() {
    await clearSession();
    router.replace('/');
  }

  if (!isFocused) {
    return <View style={[styles.safe, { backgroundColor: bg }]} />;
  }

  if (!session) {
    return (
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        <AuthGate
          icon="person.crop.circle"
          title="Profile"
          description="Sign in to manage your name, rides, and bookings."
          redirectPath="/profile"
        />
      </ScreenSafeArea>
    );
  }

  const displayName = profile?.fullName?.trim() || 'Add your name';
  const phoneLabel = formatPhoneDisplay(session.phoneE164);

  return (
    <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
      <TabScreenHeader title="Profile" textPri={textPri} hair={hair} cardBg={cardBg} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor: hair }]}>
          <LinearGradient
            colors={[TEAL + '35', ACCENT + '18', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGlow}
          />
          <View style={styles.heroContent}>
            <View style={[styles.avatarRing, { borderColor: TEAL + '55' }]}>
              <LinearGradient colors={[TEAL, '#00a896']} style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {profile?.fullName ? initials(profile.fullName) : '?'}
                </ThemedText>
              </LinearGradient>
            </View>
            <ThemedText style={[styles.heroName, { color: textPri }]} numberOfLines={2}>
              {displayName}
            </ThemedText>
            <View style={[styles.phoneChip, { backgroundColor: inputBg }]}>
              <IconSymbol name="person.fill" size={12} color={textSub} />
              <ThemedText style={[styles.phoneText, { color: textSub }]}>{phoneLabel}</ThemedText>
            </View>
          </View>
        </View>

        {editing ? (
          <View style={[styles.editCard, { backgroundColor: cardBg, borderColor: hair }]}>
            <ThemedText style={[styles.editLabel, { color: textSub }]}>FULL NAME</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.nameInput, { color: textPri, borderColor: hair, backgroundColor: inputBg }]}
              placeholder="Your full name"
              placeholderTextColor={textSub}
              autoFocus
            />
            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
            <View style={styles.editActions}>
              <Pressable
                onPress={() => {
                  setEditing(false);
                  setName(profile?.fullName ?? '');
                  setError('');
                }}
                style={[styles.editCancel, { borderColor: hair }]}
              >
                <ThemedText style={[styles.editCancelText, { color: textPri }]}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={onSave}
                disabled={saving || !name.trim()}
                style={[styles.editSaveWrap, { flex: 1, opacity: saving || !name.trim() ? 0.55 : 1 }]}
              >
                <LinearGradient colors={[TEAL, '#00a896']} style={styles.editSaveGrad}>
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ThemedText style={styles.editSaveText}>Save</ThemedText>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={[styles.menuCard, { backgroundColor: cardBg, borderColor: hair }]}>
          <MenuRow
            icon="pencil"
            iconBg={ACCENT + '16'}
            iconColor={ACCENT}
            label="Edit name"
            onPress={() => setEditing(true)}
            hair={hair}
            textPri={textPri}
            textSub={textSub}
          />
          <MenuRow
            icon="car.fill"
            iconBg={TEAL + '16'}
            iconColor={TEAL}
            label="My rides"
            onPress={() => router.push('/my-rides' as any)}
            hair={hair}
            textPri={textPri}
            textSub={textSub}
          />
          <MenuRow
            icon="list.bullet.rectangle"
            iconBg={ACCENT + '16'}
            iconColor={ACCENT}
            label="My bookings"
            onPress={() => router.push('/my-bookings' as any)}
            hair={hair}
            textPri={textPri}
            textSub={textSub}
            last
          />
        </View>

        <Pressable
          onPress={onLogout}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: isDark ? 'rgba(239,68,68,0.10)' : '#EF44440A',
              borderColor: DANGER + '45',
            },
          ]}
        >
          <ThemedText style={styles.logoutText}>Log out</ThemedText>
        </Pressable>
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },
  heroCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  heroContent: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 10 },
  avatarRing: {
    padding: 3,
    borderRadius: 48,
    borderWidth: 2,
    marginBottom: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 32 },
  heroName: { fontSize: 22, fontWeight: '900', lineHeight: 28, textAlign: 'center' },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  phoneText: { fontSize: 13, fontWeight: '700' },
  editCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  editLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  nameInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    fontWeight: '700',
  },
  editActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editCancel: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: { fontSize: 14, fontWeight: '800' },
  editSaveWrap: { borderRadius: 12, overflow: 'hidden' },
  editSaveGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  editSaveText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  errorText: { color: DANGER, fontSize: 13, fontWeight: '700' },
  menuCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '800' },
  logoutBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  logoutText: { color: DANGER, fontSize: 15, fontWeight: '900' },
});
