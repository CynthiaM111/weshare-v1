import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AuthLogo } from '@/components/auth-logo';
import { BrandWordmark } from '@/components/brand-wordmark';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand } from '@/constants/brand';

const TAGLINE = 'Share rides across Rwanda';
const CAR_SIZE = 52;
const DRIVE_MS = 2400;
const COLLAPSE_MS = 450;
const BRAND_REVEAL_MS = 550;

type SplashViewProps = {
  /** Show a subtle spinner under the tagline while the app loads. */
  showSpinner?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SplashView({ showSpinner = true, style }: SplashViewProps) {
  const { width } = useWindowDimensions();
  const startX = -CAR_SIZE - 12;
  const endX = width - CAR_SIZE - 24;

  const carX = useSharedValue(startX);
  const carScale = useSharedValue(1);
  const carOpacity = useSharedValue(1);
  const driveTaglineOpacity = useSharedValue(0);
  const laneOpacity = useSharedValue(1);
  const brandOpacity = useSharedValue(0);
  const brandScale = useSharedValue(0.92);

  useEffect(() => {
    carX.value = startX;
    carScale.value = 1;
    carOpacity.value = 1;
    driveTaglineOpacity.value = 0;
    laneOpacity.value = 1;
    brandOpacity.value = 0;
    brandScale.value = 0.92;

    driveTaglineOpacity.value = withDelay(350, withTiming(1, { duration: 500 }));

    carX.value = withTiming(
      endX,
      { duration: DRIVE_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (!finished) return;
        carScale.value = withTiming(0, {
          duration: COLLAPSE_MS,
          easing: Easing.in(Easing.back(1.4)),
        });
        carOpacity.value = withTiming(0, { duration: COLLAPSE_MS });
        driveTaglineOpacity.value = withTiming(0, { duration: 320 });
        laneOpacity.value = withDelay(180, withTiming(0, { duration: 400 }));
        brandOpacity.value = withDelay(320, withTiming(1, { duration: BRAND_REVEAL_MS }));
        brandScale.value = withDelay(
          320,
          withTiming(1, { duration: BRAND_REVEAL_MS, easing: Easing.out(Easing.cubic) }),
        );
      },
    );
  }, [width, startX, endX, carX, carScale, carOpacity, driveTaglineOpacity, laneOpacity, brandOpacity, brandScale]);

  const carStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: carX.value }, { scale: carScale.value }],
    opacity: carOpacity.value,
  }));

  const driveTaglineStyle = useAnimatedStyle(() => ({
    opacity: driveTaglineOpacity.value,
  }));

  const laneStyle = useAnimatedStyle(() => ({
    opacity: laneOpacity.value,
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ scale: brandScale.value }],
  }));

  return (
    <LinearGradient colors={[Brand.navy, Brand.navy2]} style={[styles.root, style]}>
      <Animated.View style={[styles.lane, laneStyle]} pointerEvents="none">
        <View style={styles.road}>
          <View style={styles.roadDash} />
          <View style={styles.roadDash} />
          <View style={styles.roadDash} />
        </View>
        <Animated.View style={[styles.car, carStyle]}>
          <IconSymbol name="car.fill" size={CAR_SIZE * 0.62} color={Brand.accent} />
        </Animated.View>
        <Animated.View style={[styles.driveTaglineWrap, driveTaglineStyle]}>
          <ThemedText style={styles.driveTagline}>{TAGLINE}</ThemedText>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.content, brandStyle]}>
        <AuthLogo width={112} height={80} />
        <BrandWordmark size="lg" />
        <ThemedText style={styles.tagline}>{TAGLINE}</ThemedText>
        {showSpinner ? (
          <ActivityIndicator color={Brand.teal} size="small" style={styles.spinner} />
        ) : null}
      </Animated.View>
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
  lane: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  road: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: 3,
    marginTop: 8,
    marginBottom: 18,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  roadDash: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  car: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -CAR_SIZE / 2 - 6,
    width: CAR_SIZE,
    height: CAR_SIZE,
    borderRadius: CAR_SIZE * 0.32,
    backgroundColor: 'rgba(255, 107, 53, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 53, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driveTaglineWrap: {
    marginTop: 56,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  driveTagline: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.textOnNavy,
    letterSpacing: 0.3,
    textAlign: 'center',
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
