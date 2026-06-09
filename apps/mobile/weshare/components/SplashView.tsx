import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AuthLogo } from '@/components/auth-logo';
import { BrandWordmark } from '@/components/brand-wordmark';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';

type SplashViewProps = {
  /** Show a subtle spinner under the tagline while the app loads. */
  showSpinner?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SplashView({ showSpinner = true, style }: SplashViewProps) {
  return (
    <LinearGradient colors={[Brand.navy, Brand.navy2]} style={[styles.root, style]}>
      <View style={styles.content}>
        <AuthLogo width={112} height={80} />
        <BrandWordmark size="lg" />
        <ThemedText style={styles.tagline}>Share rides across Rwanda</ThemedText>
        {showSpinner ? (
          <ActivityIndicator
            color={Brand.teal}
            size="small"
            style={styles.spinner}
          />
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  tagline: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.textMutedOnNavy,
    letterSpacing: 0.2,
  },
  spinner: {
    marginTop: 28,
  },
});
