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

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';
import { sendOtp } from '@/lib/auth/otp';
import { toE164, isValidE164 } from '@/lib/auth/phone';

export default function AuthScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const c = useThemeColors();

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
      params: { phone: e164!, redirect: redirect ?? '/' },
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.midnight }]}>
      <LinearGradient
        colors={[Colors.midnight, Colors.midnight2]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.logo}>
            <LogoMark size={48} />
            <ThemedText style={styles.appName}>WeShare</ThemedText>
            <ThemedText style={styles.tagline}>Rides across Rwanda</ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface, ...Shadow.card }]}>
            <ThemedText style={[styles.cardTitle, { color: c.text }]}>
              Enter your phone
            </ThemedText>
            <ThemedText style={[styles.cardSub, { color: c.subText }]}>
              We'll send a one-time code via SMS
            </ThemedText>

            <View style={[styles.inputWrap, { borderColor: c.hairline, backgroundColor: c.inputBg }]}>
              <ThemedText style={[styles.flag, { color: c.text }]}>🇷🇼 +250</ThemedText>
              <View style={[styles.divider, { backgroundColor: c.hairline }]} />
              <TextInput
                value={phone}
                onChangeText={(v) => { setPhone(v); setError(''); }}
                keyboardType="phone-pad"
                placeholder="78 000 0000"
                placeholderTextColor={c.subText}
                style={[styles.input, { color: c.text }]}
                maxLength={15}
              />
            </View>

            {error ? (
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            ) : null}

            <Pressable
              onPress={onSend}
              disabled={!canSend || loading}
              style={[
                styles.btn,
                { backgroundColor: Colors.accent, opacity: !canSend || loading ? 0.5 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText style={styles.btnText}>Send Code</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 32 },
  logo: { alignItems: 'center', gap: 8 },
  appName: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: 0.5 },
  tagline: { color: 'rgba(255,255,255,0.60)', fontSize: 15, fontWeight: '600' },
  card: { borderRadius: Radius.xl, padding: 24, gap: 12 },
  cardTitle: { fontSize: 20, fontWeight: '900' },
  cardSub: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  flag: { fontSize: 15, fontWeight: '700' },
  divider: { width: 1, height: 22 },
  input: { flex: 1, fontSize: 16, fontWeight: '700', padding: 0 },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },
  btn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnText: { color: 'white', fontSize: 16, fontWeight: '900' },
});
