import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export default function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none" accessibilityRole="image">
      <Circle cx="30" cy="50" r="15" fill="url(#weshareLogoGradient1)" opacity={0.9} />
      <Circle cx="50" cy="50" r="18" fill="url(#weshareLogoGradient2)" />
      <Circle cx="70" cy="50" r="15" fill="url(#weshareLogoGradient1)" opacity={0.9} />

      <Path d="M45 50 L55 50" stroke="white" strokeWidth={3} strokeLinecap="round" />
      <Path d="M25 50 L35 50" stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      <Path d="M65 50 L75 50" stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8} />

      <Path
        d="M20 75 Q50 65 80 75"
        stroke="url(#weshareLogoGradient2)"
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />

      <Defs>
        <LinearGradient id="weshareLogoGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#3B82F6" />
          <Stop offset="100%" stopColor="#6366F1" />
        </LinearGradient>
        <LinearGradient id="weshareLogoGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#3B82F6" />
          <Stop offset="50%" stopColor="#6366F1" />
          <Stop offset="100%" stopColor="#8B5CF6" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

