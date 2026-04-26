import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatRwandanPhoneDisplay, isValidRwandanPhone, normalizeRwandanPhone } from '@/lib/auth/phone';
import { startOtp } from '@/lib/auth/otp';

function formatLocalRwandaDigits(raw: string) {
  // Keep only digits; allow leading 7... or 07...
  const digits = raw.replace(/\D/g, '');
  const cleaned = digits.startsWith('0') ? digits.slice(1) : digits;
  const limited = cleaned.slice(0, 9); // 7XXXXXXXX

  // Display as 7XX XXX XXX
  const a = limited.slice(0, 3);
  const b = limited.slice(3, 6);
  const c = limited.slice(6, 9);
  return [a, b, c].filter(Boolean).join(' ');
}

export default function PhoneEntryScreen() {
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

  const [local, setLocal] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const formattedLocal = useMemo(() => formatLocalRwandaDigits(local), [local]);

  const fullPhone = useMemo(() => `+250${formattedLocal.replace(/\s/g, '')}`, [formattedLocal]);
  const valid = useMemo(() => isValidRwandanPhone(fullPhone), [fullPhone]);
  const normalized = useMemo(() => normalizeRwandanPhone(fullPhone), [fullPhone]);

  async function onContinue() {
    if (!normalized || submitting) return;
    setSubmitting(true);
    try {
      const { verificationId, phoneE164 } = await startOtp(phoneE164FromNormalized(normalized));
      router.push({
        pathname: '/auth/otp',
        params: {
          verificationId,
          phone: phoneE164,
          redirect: redirect || undefined,
        },
      });
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
          <LogoMark size={34} />
          <ThemedText style={[styles.brand, { color: text }]}>WeShare</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: surface, borderColor: hairline }]}>
          <ThemedText style={[styles.title, { color: text }]}>Enter your phone number</ThemedText>
          <ThemedText style={[styles.subtitle, { color: subText }]}>
            We’ll send a 6‑digit code to verify your number.
          </ThemedText>

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
              maxLength={11} // includes spaces
            />
          </View>

          <ThemedText style={[styles.hint, { color: subText }]}>
            Format: +250 7XX XXX XXX
          </ThemedText>

          {normalized ? (
            <ThemedText style={[styles.preview, { color: subText }]}>
              You entered: {formatRwandanPhoneDisplay(normalized)}
            </ThemedText>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            onPress={onContinue}
            disabled={!valid || submitting}
            style={[
              styles.primary,
              { backgroundColor: '#00AEEF', opacity: !valid || submitting ? 0.55 : 1 },
            ]}>
            <ThemedText style={styles.primaryText}>{submitting ? 'Continuing…' : 'Continue'}</ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/auth/signup', params: { redirect: redirect || undefined } })}
            style={styles.linkRow}
          >
            <ThemedText style={[styles.linkMeta, { color: subText }]}>Don’t have an account?</ThemedText>
            <ThemedText style={styles.linkText}> Sign up</ThemedText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function phoneE164FromNormalized(n: string) {
  // normalizeRwandanPhone already returns E.164.
  return n;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  bg: { position: 'absolute', left: 0, right: 0, top: 0, height: 520 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14 },
  brand: { fontSize: 18, fontWeight: '900' },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 10 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 18, fontWeight: '600', opacity: 0.9 },
  phoneRow: {
    height: 56,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  flagWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flag: { fontSize: 18 },
  cc: { fontSize: 14, fontWeight: '900' },
  sep: { width: 1, height: 26, marginHorizontal: 12, opacity: 0.8 },
  phoneInput: { flex: 1, fontSize: 16, fontWeight: '800', letterSpacing: 0.3, padding: 0 },
  hint: { fontSize: 12, lineHeight: 16, fontWeight: '600', opacity: 0.82 },
  preview: { fontSize: 12, lineHeight: 16, fontWeight: '700', opacity: 0.85 },
  primary: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '900' },
  linkRow: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  linkMeta: { fontSize: 12, lineHeight: 16, fontWeight: '700', opacity: 0.85 },
  linkText: { fontSize: 12, lineHeight: 16, fontWeight: '900', color: '#00AEEF' },
});

