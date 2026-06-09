/**
 * WeShare — Auth: Signup
 * Shown only on first login to collect the user's full name.
 */

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
import { useSession } from '@/hooks/use-session';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { normalizeAuthRedirect, parseAuthRedirectRoute } from '@/lib/auth/navigation';
import { upsertProfile } from '@/lib/auth/users';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const DANGER = '#EF4444';

export default function SignupScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { session } = useSession();

  useRedirectIfAuthenticated({ redirect, allowIncompleteProfile: true });

  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSave = fullName.trim().length >= 2;

  async function onSave() {
    if (!canSave || loading) return;
    setError('');
    setLoading(true);

    if (!session) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      router.replace('/auth' as any);
      return;
    }

    const err = await upsertProfile(session.userId, {
      fullName: fullName.trim(),
      phoneE164: session.phoneE164,
    });

    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace(parseAuthRedirectRoute(normalizeAuthRedirect(redirect)) as any);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[NAVY, NAVY_2]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.content}>
            <View style={styles.hero}>
              <AuthLogo />
              <ThemedText style={styles.heroTitle}>Enter your name</ThemedText>
              <ThemedText style={styles.heroSub}>
                One last step — what should we call you?
              </ThemedText>
            </View>

            <View style={styles.card}>
              <ThemedText style={styles.fieldLabel}>YOUR NAME</ThemedText>
              <View
                style={[
                  styles.inputWrap,
                  error ? { borderColor: DANGER } : null,
                ]}
              >
                <IconSymbol name="person.fill" size={16} color="rgba(255,255,255,0.35)" />
                <TextInput
                  value={fullName}
                  onChangeText={v => {
                    setFullName(v);
                    setError('');
                  }}
                  placeholder="Full name"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  style={styles.input}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={onSave}
                  autoCapitalize="words"
                />
                {canSave ? <View style={styles.validDot} /> : null}
              </View>

              {error ? (
                <View style={styles.errorRow}>
                  <IconSymbol name={'exclamationmark.circle.fill' as any} size={13} color={DANGER} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              <Pressable
                onPress={onSave}
                disabled={!canSave || loading}
                style={[styles.btnWrap, { opacity: !canSave || loading ? 0.42 : 1 }]}
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
                      <ThemedText style={styles.btnText}>Let's go</ThemedText>
                      <IconSymbol name={'arrow.right' as any} size={16} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.note}>
              Your name is shown to drivers and passengers when you book or post a ride.
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
  inputWrap: {
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
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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
  note: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});
