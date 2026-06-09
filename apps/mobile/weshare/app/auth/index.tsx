import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

import { AuthLogo } from '@/components/auth-logo';
import { ThemedText } from '@/components/themed-text';
import { useRedirectIfAuthenticated } from '@/hooks/use-redirect-if-authenticated';
import { isOtpDevBypassEnabled, isSandboxApp } from '@/lib/app-env';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { normalizeAuthRedirect } from '@/lib/auth/navigation';
import { sendOtp } from '@/lib/auth/otp';
import { toE164, isValidE164 } from '@/lib/auth/phone';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const TEAL = '#00C9B1';
const ACCENT = '#FF6B35';
const DANGER = '#EF4444';

export default function AuthScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  useRedirectIfAuthenticated({ redirect });

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const e164 = toE164(phone);
  const canSend = Boolean(e164 && isValidE164(e164));

  async function onSend() {
    if (!canSend || loading) return;
    setError('');
    setLoading(true);
    const err = await sendOtp(e164!);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.push({
      pathname: '/auth/otp',
      params: { phone: e164!, redirect: normalizeAuthRedirect(redirect) },
    });
  }

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

          <View style={styles.content}>
            <View style={styles.hero}>
              <AuthLogo />
              <ThemedText style={styles.heroTitle}>Sign in to WeShare</ThemedText>
              <ThemedText style={styles.heroSub}>
                Enter your Rwanda phone number. We'll text you a 6-digit code.
              </ThemedText>
            </View>

            <View style={styles.card}>
            <ThemedText style={styles.fieldLabel}>PHONE NUMBER</ThemedText>

            <View
              style={[
                styles.inputRow,
                error ? { borderColor: DANGER } : null,
              ]}
            >
              <ThemedText style={styles.flag}>🇷🇼</ThemedText>
              <ThemedText style={styles.prefix}>+250</ThemedText>
              <View style={styles.divider} />
              <TextInput
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setError('');
                }}
                keyboardType="phone-pad"
                placeholder="78 000 0000"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={styles.input}
                maxLength={15}
              />
              {canSend ? <View style={styles.validDot} /> : null}
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <IconSymbol name={'exclamationmark.circle.fill' as any} size={13} color={DANGER} />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            {isOtpDevBypassEnabled() ? (
              <ThemedText style={styles.hintText}>
                Internal testing: use your real number — the code appears on the next screen (no SMS).
              </ThemedText>
            ) : isSandboxApp() ? (
              <ThemedText style={styles.hintText}>
                Test numbers: +250780000001 – +250780000006 (code: 123456)
              </ThemedText>
            ) : null}

            <Pressable
              onPress={onSend}
              disabled={!canSend || loading}
              style={[styles.btnWrap, { opacity: !canSend || loading ? 0.42 : 1 }]}
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
                    <ThemedText style={styles.btnText}>Send Code</ThemedText>
                    <IconSymbol name={'arrow.right' as any} size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.legal}>
              By continuing you agree to WeShare's terms of service.
            </ThemedText>
          </View>
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
  content: { flex: 1, justifyContent: 'center', gap: 28 },
  hero: { alignItems: 'center', gap: 12 },
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 20,
    gap: 12,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    gap: 10,
  },
  flag: { fontSize: 18 },
  prefix: { color: '#fff', fontSize: 15, fontWeight: '800' },
  divider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.15)' },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 0,
  },
  validDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEAL,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { color: DANGER, fontSize: 13, fontWeight: '700', flex: 1 },
  hintText: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  btnWrap: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  btnGrad: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  footer: { paddingTop: 16 },
  legal: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});
