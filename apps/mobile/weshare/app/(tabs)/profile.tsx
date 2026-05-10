import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useThemeColors } from '@/hooks/use-theme-color';
import { clearSession } from '@/lib/auth/session';
import { upsertProfile } from '@/lib/auth/users';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase().slice(0, 2);
}

export default function ProfileScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { session, profile, refreshProfile } = useSession();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.fullName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function onSave() {
    if (!session || !name.trim()) return;
    setSaving(true); setError('');
    const err = await upsertProfile(session.userId, { fullName: name.trim() });
    if (err) { setError(err); setSaving(false); return; }
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  }

  async function onLogout() {
    await clearSession();
    router.replace('/auth' as any);
  }

  // Avoid inactive tab scenes painting login/profile UI on top of other tabs (RN Screens stacking glitches).
  if (!isFocused) {
    return <View style={[styles.safe, { backgroundColor: c.background }]} />;
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <View style={styles.center}>
          <ThemedText style={[styles.title, { color: c.text }]}>Profile</ThemedText>
          <ThemedText style={[styles.sub, { color: c.subText }]}>Login to view your profile</ThemedText>
          <Pressable onPress={() => router.push('/auth')} style={styles.btn}>
            <ThemedText style={styles.btnText}>Login</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: Colors.accent }]}>
            <ThemedText style={styles.avatarText}>
              {profile?.fullName ? initials(profile.fullName) : '?'}
            </ThemedText>
          </View>
          {editing ? (
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.nameInput, { color: c.text, borderColor: c.hairline, backgroundColor: c.inputBg }]}
              placeholder="Full name"
              placeholderTextColor={c.subText}
              autoFocus
            />
          ) : (
            <ThemedText style={[styles.name, { color: c.text }]}>{profile?.fullName ?? '—'}</ThemedText>
          )}
          <ThemedText style={[styles.phone, { color: c.subText }]}>{session.phoneE164}</ThemedText>
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        {/* Actions */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.hairline }]}>
          {editing ? (
            <>
              <Pressable onPress={onSave} disabled={saving} style={[styles.row, { borderBottomColor: c.hairline }]}>
                {saving ? <ActivityIndicator color={Colors.accent} size="small" /> : null}
                <ThemedText style={[styles.rowText, { color: Colors.accent }]}>
                  {saving ? 'Saving…' : 'Save name'}
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => { setEditing(false); setName(profile?.fullName ?? ''); }} style={styles.row}>
                <ThemedText style={[styles.rowText, { color: c.subText }]}>Cancel</ThemedText>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => setEditing(true)} style={[styles.row, { borderBottomColor: c.hairline }]}>
              <ThemedText style={[styles.rowText, { color: c.text }]}>Edit name</ThemedText>
            </Pressable>
          )}

          <Pressable onPress={() => router.push('/my-rides')} style={[styles.row, { borderBottomColor: c.hairline }]}>
            <ThemedText style={[styles.rowText, { color: c.text }]}>My rides</ThemedText>
          </Pressable>

          <Pressable onPress={() => router.push('/my-bookings')} style={styles.row}>
            <ThemedText style={[styles.rowText, { color: c.text }]}>My bookings</ThemedText>
          </Pressable>
        </View>

        <Pressable onPress={onLogout} style={[styles.logoutBtn, { borderColor: Colors.danger + '44' }]}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  scroll: { paddingHorizontal: 20, gap: 20 },
  title: { fontSize: 24, fontWeight: '900' },
  sub: { fontSize: 14, fontWeight: '600' },
  btn: { height: 44, paddingHorizontal: 24, borderRadius: Radius.lg, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontSize: 14, fontWeight: '900' },
  avatarWrap: { alignItems: 'center', gap: 10, paddingTop: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontSize: 28, fontWeight: '900' },
  name: { fontSize: 22, fontWeight: '900' },
  phone: { fontSize: 14, fontWeight: '600' },
  nameInput: {
    borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 44,
    fontSize: 16, fontWeight: '700', width: 220, textAlign: 'center',
  },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  section: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', ...Shadow.card },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  rowText: { fontSize: 15, fontWeight: '700' },
  logoutBtn: { height: 50, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: '800' },
}) as any;
