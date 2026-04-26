import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatRwandanPhoneDisplay, normalizeRwandanPhone } from '@/lib/auth/phone';
import { clearPendingOtp, startOtp } from '@/lib/auth/otp';
import { saveSession, sessionFromVerifiedPhone } from '@/lib/auth/session';

const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.70)', dark: 'rgba(236,237,238,0.72)' }, 'text');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');

  const params = useLocalSearchParams<{ verificationId?: string; phone?: string; redirect?: string }>();
  const phoneParam = typeof params.phone === 'string' ? params.phone : '';
  const redirect = typeof params.redirect === 'string' ? params.redirect : '';
  const normalized = normalizeRwandanPhone(phoneParam) ?? normalizeRwandanPhone(`+${phoneParam.replace(/[^\d]/g, '')}`);

  const display = useMemo(() => (normalized ? formatRwandanPhoneDisplay(normalized) : phoneParam), [normalized, phoneParam]);

  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    setSeconds(RESEND_SECONDS);
  }, [params.verificationId]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const canVerify = useMemo(() => /^\d{6}$/.test(code), [code]);

  async function onVerify() {
    if (!normalized || !canVerify || verifying) return;
    setVerifying(true);
    try {
      // SMS provider not wired yet. For now, any 6 digits "verifies".
      await saveSession(sessionFromVerifiedPhone(normalized));
      await clearPendingOtp();
      setVerified(true);
      Keyboard.dismiss();
      router.replace((redirect || '/') as any);
    } finally {
      setVerifying(false);
    }
  }

  async function onResend() {
    if (!normalized || seconds > 0) return;
    const { verificationId } = await startOtp(normalized);
    // Keep the flow self-contained: reset state, stay on same screen.
    setCode('');
    setVerified(false);
    setSeconds(RESEND_SECONDS);
    router.setParams({ verificationId });
    requestAnimationFrame(() => inputRef.current?.focus());
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
            <IconSymbol name="chevron.right" size={22} color={icon} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <View style={styles.headerCenter}>
            <LogoMark size={30} />
            <ThemedText style={[styles.brand, { color: text }]}>Verify</ThemedText>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={[styles.card, { backgroundColor: surface, borderColor: hairline }]}>
          <ThemedText style={[styles.title, { color: text }]}>Enter the 6‑digit code</ThemedText>
          <ThemedText style={[styles.subtitle, { color: subText }]}>
            Sent to {display}
          </ThemedText>

          <View style={[styles.codeWrap, { borderColor: hairline }]}>
            <TextInput
              ref={(r) => {
                inputRef.current = r;
              }}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={6}
              style={[styles.codeInput, { color: text }]}
              selectTextOnFocus
              autoFocus
              onSubmitEditing={onVerify}
            />
          </View>

          <View style={styles.metaRow}>
            <ThemedText style={[styles.meta, { color: subText }]}>
              {seconds > 0 ? `Resend in ${seconds}s` : 'Didn’t get a code?'}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={onResend}
              disabled={seconds > 0}
              style={[styles.linkBtn, { opacity: seconds > 0 ? 0.4 : 1 }]}>
              <ThemedText style={[styles.linkText, { color: '#00AEEF' }]}>Resend</ThemedText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Verify"
            onPress={onVerify}
            disabled={!canVerify || verifying || verified}
            style={[
              styles.primary,
              { backgroundColor: '#00AEEF', opacity: !canVerify || verifying || verified ? 0.55 : 1 },
            ]}>
            <ThemedText style={styles.primaryText}>
              {verified ? 'Verified' : verifying ? 'Verifying…' : 'Verify'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  bg: { position: 'absolute', left: 0, right: 0, top: 0, height: 520 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontSize: 18, fontWeight: '900' },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 10 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 18, fontWeight: '600', opacity: 0.9 },
  codeWrap: { height: 58, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, justifyContent: 'center', marginTop: 8 },
  codeInput: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    padding: 0,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: '600', opacity: 0.85 },
  linkBtn: { paddingVertical: 8, paddingHorizontal: 6 },
  linkText: { fontSize: 12, fontWeight: '900' },
  primary: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '900' },
});

