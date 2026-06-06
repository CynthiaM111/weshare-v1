import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthLogo } from '@/components/auth-logo';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const AMBER = '#F59E0B';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export function SessionExpiredScreen({ visible, onDismiss }: Props) {
  const router = useRouter();

  function onSignInAgain() {
    onDismiss();
    router.replace('/auth' as any);
  }

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <LinearGradient colors={[NAVY, NAVY_2]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <AuthLogo />
          <View style={styles.iconWrap}>
            <IconSymbol name="clock.fill" size={28} color={AMBER} />
          </View>
          <ThemedText style={styles.title}>Session expired</ThemedText>
          <ThemedText style={styles.sub}>
            For your security, we signed you out. Sign in again with your phone number to continue.
          </ThemedText>
          <Pressable onPress={onSignInAgain} style={styles.btnWrap}>
            <LinearGradient
              colors={[ACCENT, '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              <ThemedText style={styles.btnText}>Sign in again</ThemedText>
              <IconSymbol name={'arrow.right' as any} size={16} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  btnWrap: { borderRadius: 14, overflow: 'hidden', width: '100%', marginTop: 12 },
  btnGrad: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
