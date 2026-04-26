import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatRwandanPhoneDisplay, isValidRwandanPhone, normalizeRwandanPhone } from '@/lib/auth/phone';
import { saveSession, sessionFromVerifiedPhone } from '@/lib/auth/session';
import { upsertUser } from '@/lib/auth/users';

function formatLocalRwandaDigits(raw: string) {
  const digits = raw.replace(/\D/g, '');
  const cleaned = digits.startsWith('0') ? digits.slice(1) : digits;
  const limited = cleaned.slice(0, 9);
  const a = limited.slice(0, 3);
  const b = limited.slice(3, 6);
  const c = limited.slice(6, 9);
  return [a, b, c].filter(Boolean).join(' ');
}

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect = typeof params.redirect === 'string' ? params.redirect : '';
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.70)', dark: 'rgba(236,237,238,0.72)' }, 'text');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');

  const [fullName, setFullName] = useState('');
  const [local, setLocal] = useState('7');
  const [submitting, setSubmitting] = useState(false);

  const formattedLocal = useMemo(() => formatLocalRwandaDigits(local), [local]);
  const fullPhone = useMemo(() => `+250${formattedLocal.replace(/\s/g, '')}`, [formattedLocal]);
  const validPhone = useMemo(() => isValidRwandanPhone(fullPhone), [fullPhone]);
  const normalized = useMemo(() => normalizeRwandanPhone(fullPhone), [fullPhone]);
  const validName = useMemo(() => fullName.trim().length >= 2, [fullName]);

  async function onSignUp() {
    if (!normalized || !validPhone || !validName || submitting) return;
    setSubmitting(true);
    try {
      // No backend yet: create local profile + session.
      const session = sessionFromVerifiedPhone(normalized);
      await upsertUser({
        userId: session.userId,
        fullName: fullName.trim(),
        phoneE164: normalized,
        createdAtISO: new Date().toISOString(),
      });
      await saveSession(session);
      router.replace((redirect || '/') as any);
    } catch {
      Alert.alert('Could not sign up', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <View style={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
        <LinearGradient
          colors={scheme === 'dark' ? ['#0B1220', '#151718'] : ['#E6F8FE', '#EFE8FF']}
          style={styles.bg}
        />

        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.right" size={22} color={text} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <View style={styles.headerCenter}>
            <LogoMark size={30} />
            <ThemedText style={[styles.brand, { color: text }]}>Sign up</ThemedText>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
          <View style={[styles.card, { backgroundColor: surface, borderColor: hairline }]}>
            <ThemedText style={[styles.title, { color: text }]}>Create your account</ThemedText>
            <ThemedText style={[styles.subtitle, { color: subText }]}>Drivers need an account to post rides.</ThemedText>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: subText }]}>Full name</ThemedText>
              <View style={[styles.inputRow, { borderColor: hairline }]}>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(17,24,28,0.42)"
                  style={[styles.input, { color: text }]}
                  selectTextOnFocus
                />
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: subText }]}>Phone number</ThemedText>
              <View style={[styles.phoneRow, { borderColor: hairline }]}>
                <View style={styles.flagWrap}>
                  <ThemedText style={styles.flag}>🇷🇼</ThemedText>
                  <ThemedText style={[styles.cc, { color: text }]}>+250</ThemedText>
                </View>
                <View style={[styles.sep, { backgroundColor: hairline }]} />
                <TextInput
                  value={formattedLocal}
                  onChangeText={(v) => setLocal(v)}
                  placeholder="7XX XXX XXX"
                  placeholderTextColor="rgba(17,24,28,0.42)"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  style={[styles.phoneInput, { color: text }]}
                  selectTextOnFocus
                  maxLength={11}
                />
              </View>

              {normalized ? (
                <ThemedText style={[styles.preview, { color: subText }]}>
                  You entered: {formatRwandanPhoneDisplay(normalized)}
                </ThemedText>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign up"
              onPress={onSignUp}
              disabled={!validName || !validPhone || submitting}
              style={[
                styles.primary,
                { backgroundColor: '#00AEEF', opacity: !validName || !validPhone || submitting ? 0.55 : 1 },
              ]}
            >
              <ThemedText style={styles.primaryText}>{submitting ? 'Creating…' : 'Sign up'}</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace({ pathname: '/auth', params: { redirect: redirect || undefined } })}
              style={styles.linkRow}
            >
              <ThemedText style={[styles.linkMeta, { color: subText }]}>Already have an account?</ThemedText>
              <ThemedText style={styles.linkText}> Login</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  bg: { position: 'absolute', left: 0, right: 0, top: 0, height: 520 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontSize: 18, fontWeight: '900' },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 18, fontWeight: '600', opacity: 0.9 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '800', opacity: 0.9 },
  inputRow: { height: 56, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, justifyContent: 'center' },
  input: { fontSize: 15, fontWeight: '800', padding: 0 },
  phoneRow: {
    height: 56,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flag: { fontSize: 18 },
  cc: { fontSize: 14, fontWeight: '900' },
  sep: { width: 1, height: 26, marginHorizontal: 12, opacity: 0.8 },
  phoneInput: { flex: 1, fontSize: 16, fontWeight: '800', letterSpacing: 0.3, padding: 0 },
  preview: { fontSize: 12, lineHeight: 16, fontWeight: '700', opacity: 0.85 },
  primary: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '900' },
  linkRow: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  linkMeta: { fontSize: 12, fontWeight: '700' },
  linkText: { fontSize: 12, fontWeight: '900', color: '#00AEEF' },
});

