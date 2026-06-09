/**
 * WeShare — Auth: OTP Verification
 * 6-digit code entry with individual digit boxes.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthLogo } from '@/components/auth-logo';
import { ThemedText } from '@/components/themed-text';
import { useRedirectIfAuthenticated } from '@/hooks/use-redirect-if-authenticated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isOtpDevBypassEnabled } from '@/lib/app-env';
import { resolvePostLoginRoute } from '@/lib/auth/navigation';
import { verifyOtp, sendOtp, fetchDevOtpCode } from '@/lib/auth/otp';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const DANGER = '#EF4444';
const DIGITS = 6;

export default function OtpScreen() {
  const router = useRouter();
  const { phone, redirect } = useLocalSearchParams<{ phone: string; redirect?: string }>();

  useRedirectIfAuthenticated({ redirect });

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [devOtpLoading, setDevOtpLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const otpDevBypass = isOtpDevBypassEnabled();

  useEffect(() => {
    if (!otpDevBypass || !phone) return;

    let cancelled = false;
    setDevOtp(null);
    setDevOtpLoading(true);

    async function pollDevOtp() {
      for (let i = 0; i < 20 && !cancelled; i++) {
        const next = await fetchDevOtpCode(phone);
        if (next) {
          if (!cancelled) {
            setDevOtp(next);
            setDevOtpLoading(false);
          }
          return;
        }
        await new Promise(r => setTimeout(r, 600));
      }
      if (!cancelled) setDevOtpLoading(false);
    }

    void pollDevOtp();
    return () => {
      cancelled = true;
    };
  }, [phone, otpDevBypass, resent]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function onVerify() {
    if (code.length < DIGITS || loading) return;
    setError('');
    setLoading(true);

    const err = await verifyOtp(phone, code);
    if (err) {
      setLoading(false);
      setError('Invalid code. Please try again.');
      setCode('');
      return;
    }

    setLoading(false);
    const next = await resolvePostLoginRoute(redirect);
    if (next.pathname === '/auth/signup') {
      router.replace({ pathname: next.pathname, params: next.params } as any);
      return;
    }
    router.replace(next as any);
  }

  async function onResend() {
    if (resending || countdown > 0) return;
    setResending(true);
    setError('');
    await sendOtp(phone);
    setResending(false);
    setResent(true);
    setCountdown(30);
    setCode('');
    setTimeout(() => setResent(false), 3000);
  }

  useEffect(() => {
    if (code.length === DIGITS) onVerify();
  }, [code]);

  const digits = code.split('').concat(Array(DIGITS - code.length).fill(''));

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[NAVY, NAVY_2]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backIconBtn}
          >
            <IconSymbol name="chevron.left" size={22} color="#fff" />
          </Pressable>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 24) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces
          >
            <View style={[styles.hero, otpDevBypass && styles.heroCompact]}>
              {!otpDevBypass ? <AuthLogo /> : null}
              <ThemedText style={styles.heroTitle}>Enter the code</ThemedText>
              <ThemedText style={styles.heroSub}>
                {otpDevBypass
                  ? 'Use the test code below — no SMS was sent.'
                  : 'We texted a 6-digit code to '}
                {!otpDevBypass ? (
                  <ThemedText style={styles.heroPhone}>{phone}</ThemedText>
                ) : null}
              </ThemedText>
            </View>

            <View style={[styles.card, otpDevBypass && styles.cardWithDevBanner]}>
              {otpDevBypass ? (
                <Pressable
                  onPress={() => devOtp && setCode(devOtp)}
                  disabled={!devOtp}
                  style={[
                    styles.devOtpBanner,
                    devOtp ? styles.devOtpBannerReady : null,
                  ]}
                >
                  <Text style={styles.devOtpLabel}>YOUR TEST CODE</Text>
                  {devOtpLoading && !devOtp ? (
                    <ActivityIndicator color={TEAL} style={styles.devOtpSpinner} />
                  ) : (
                    <View style={styles.devOtpDigitRow}>
                      {(devOtp ?? '······').split('').map((char, i) => (
                        <View key={i} style={styles.devOtpDigitBox}>
                          <Text style={styles.devOtpDigitText} allowFontScaling={false}>
                            {char}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={styles.devOtpHint}>
                    {devOtp ? 'Tap to fill · valid 5 min' : 'Generating code…'}
                  </Text>
                </Pressable>
              ) : null}

              <ThemedText style={styles.fieldLabel}>VERIFICATION CODE</ThemedText>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={v => {
                  setCode(v.replace(/\D/g, '').slice(0, DIGITS));
                  setError('');
                }}
                keyboardType="number-pad"
                maxLength={DIGITS}
                style={styles.hiddenInput}
                autoFocus
                caretHidden
              />

              <Pressable onPress={() => inputRef.current?.focus()} style={styles.digitRow}>
                {digits.map((d, i) => {
                  const active = i === code.length;
                  const filled = d !== '';
                  return (
                    <View
                      key={i}
                      style={[
                        styles.digitBox,
                        filled && { borderColor: TEAL, backgroundColor: 'rgba(0,201,177,0.10)' },
                        active && !filled && { borderColor: ACCENT },
                        error ? { borderColor: DANGER } : null,
                      ]}
                    >
                      {loading && filled ? (
                        <ActivityIndicator size="small" color={TEAL} />
                      ) : (
                        <ThemedText style={[styles.digitText, filled && { color: '#fff' }]}>
                          {d || ''}
                        </ThemedText>
                      )}
                    </View>
                  );
                })}
              </Pressable>

              {error ? (
                <View style={styles.errorRow}>
                  <IconSymbol name={'exclamationmark.circle.fill' as any} size={13} color={DANGER} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              {resent ? (
                <View style={styles.resentRow}>
                  <IconSymbol name={'checkmark.circle.fill' as any} size={13} color={TEAL} />
                  <ThemedText style={styles.resentText}>Code resent successfully</ThemedText>
                </View>
              ) : null}

              <Pressable
                onPress={onVerify}
                disabled={code.length < DIGITS || loading}
                style={[styles.btnWrap, { opacity: code.length < DIGITS || loading ? 0.42 : 1 }]}
              >
                <LinearGradient
                  colors={[ACCENT, '#FF4500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGrad}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <ThemedText style={styles.btnText}>Verify</ThemedText>
                      <IconSymbol name={'arrow.right' as any} size={16} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={onResend}
                disabled={resending || countdown > 0}
                style={styles.resendBtn}
              >
                <ThemedText
                  style={[
                    styles.resendText,
                    (resending || countdown > 0) && { opacity: 0.40 },
                  ]}
                >
                  {countdown > 0
                    ? `Resend code in ${countdown}s`
                    : resending
                      ? 'Resending…'
                      : "Didn't get a code? Resend"}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  kav: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
  },
  backIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    gap: 20,
  },
  hero: { alignItems: 'center', gap: 12 },
  heroCompact: { gap: 8, paddingTop: 4 },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  heroPhone: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 20,
    gap: 14,
    overflow: 'visible',
  },
  cardWithDevBanner: {
    paddingTop: 22,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  digitRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  digitBox: {
    width: 44,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.20)',
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { color: DANGER, fontSize: 13, fontWeight: '700', flex: 1 },
  resentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resentText: { color: TEAL, fontSize: 13, fontWeight: '700' },
  btnWrap: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  btnGrad: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  resendBtn: { alignItems: 'center', paddingVertical: 2 },
  resendText: { color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: '700' },
  devOtpBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,201,177,0.08)',
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 12,
    overflow: 'visible',
    marginBottom: 2,
  },
  devOtpBannerReady: {
    borderColor: TEAL,
    backgroundColor: 'rgba(0,201,177,0.14)',
  },
  devOtpLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    lineHeight: 18,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  devOtpSpinner: { marginVertical: 12 },
  devOtpDigitRow: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  devOtpDigitBox: {
    width: 38,
    minHeight: 52,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0,201,177,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devOtpDigitText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  devOtpHint: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    paddingTop: 2,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});
