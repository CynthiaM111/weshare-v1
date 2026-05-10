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
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { verifyOtp, sendOtp } from '@/lib/auth/otp';
import { getProfile } from '@/lib/auth/users';
import { loadSession } from '@/lib/auth/session';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const DANGER = '#EF4444';
const DIGITS = 6;

export default function OtpScreen() {
  const router = useRouter();
  const { phone, redirect } = useLocalSearchParams<{ phone: string; redirect?: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  // Countdown timer for resend
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

    const session = await loadSession();
    if (!session) {
      setLoading(false);
      setError('Something went wrong. Please try again.');
      return;
    }

    // Check if first time user
    const profile = await getProfile(session.userId);
    setLoading(false);

    if (!profile?.fullName) {
      router.replace({
        pathname: '/auth/signup',
        params: { redirect: redirect ?? '/' },
      } as any);
    } else {
      router.replace((redirect ?? '/') as any);
    }
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

  // Auto-verify when all 6 digits entered
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

          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={16} color="rgba(255,255,255,0.60)" />
            <ThemedText style={styles.backText}>Back</ThemedText>
          </Pressable>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <IconSymbol name="lock.fill" size={28} color={TEAL} />
            </View>
            <ThemedText style={styles.heroTitle}>Enter the code</ThemedText>
            <ThemedText style={styles.heroSub}>
              Sent to <ThemedText style={styles.heroPhone}>{phone}</ThemedText>
            </ThemedText>
          </View>

          {/* Hidden input captures typing */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={v => { setCode(v.replace(/\D/g, '').slice(0, DIGITS)); setError(''); }}
            keyboardType="number-pad"
            maxLength={DIGITS}
            style={styles.hiddenInput}
            autoFocus
            caretHidden
          />

          {/* 6 digit boxes */}
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
                    error && { borderColor: DANGER },
                  ]}
                >
                  {loading && filled
                    ? <ActivityIndicator size="small" color={TEAL} />
                    : <ThemedText style={[styles.digitText, filled && { color: '#fff' }]}>
                      {d || ''}
                    </ThemedText>
                  }
                </View>
              );
            })}
          </Pressable>

          {/* Error */}
          {error ? (
            <View style={styles.errorRow}>
              <IconSymbol name="exclamationmark.circle.fill" size={13} color={DANGER} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          {/* Resent confirmation */}
          {resent ? (
            <View style={styles.resentRow}>
              <IconSymbol name="checkmark.circle.fill" size={13} color={TEAL} />
              <ThemedText style={styles.resentText}>Code resent successfully</ThemedText>
            </View>
          ) : null}

          {/* Verify button */}
          <Pressable
            onPress={onVerify}
            disabled={code.length < DIGITS || loading}
            style={[styles.btn, { opacity: code.length < DIGITS || loading ? 0.42 : 1 }]}
          >
            <LinearGradient
              colors={[ACCENT, '#FF4500']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <ThemedText style={styles.btnText}>Verify →</ThemedText>
              }
            </LinearGradient>
          </Pressable>

          {/* Resend */}
          <Pressable
            onPress={onResend}
            disabled={resending || countdown > 0}
            style={styles.resendBtn}
          >
            <ThemedText style={[
              styles.resendText,
              (resending || countdown > 0) && { opacity: 0.40 },
            ]}>
              {countdown > 0
                ? `Resend code in ${countdown}s`
                : resending ? 'Resending…' : "Didn't get a code? Resend"
              }
            </ThemedText>
          </Pressable>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  kav: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 20 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { color: 'rgba(255,255,255,0.60)', fontSize: 14, fontWeight: '700' },

  hero: { gap: 10, marginTop: 16 },
  heroIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(0,201,177,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,201,177,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.50)', fontSize: 14, fontWeight: '600' },
  heroPhone: { color: '#fff', fontWeight: '800' },

  hiddenInput: {
    position: 'absolute', width: 0, height: 0, opacity: 0,
  },

  digitRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  digitBox: {
    width: 46, height: 54, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  digitText: {
    fontSize: 22, fontWeight: '900',
    color: 'rgba(255,255,255,0.20)',
  },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  resentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resentText: { color: '#00C9B1', fontSize: 13, fontWeight: '700' },

  btn: { borderRadius: 14, overflow: 'hidden' },
  btnGrad: { height: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  resendBtn: { alignItems: 'center', paddingVertical: 4 },
  resendText: { color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: '700' },
}) as any;
