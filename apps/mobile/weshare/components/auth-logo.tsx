import Svg, { Circle, Path } from 'react-native-svg';

type AuthLogoProps = {
  width?: number;
  height?: number;
};

export function AuthLogo({ width = 84, height = 60 }: AuthLogoProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 70 50" fill="none">
      <Path
        d="M22 2c-8.836 0-16 7.164-16 16 0 11 16 28 16 28s16-17 16-28C38 9.164 30.836 2 22 2Z"
        fill="#00C9B1"
      />
      <Circle cx={22} cy={18} r={6} fill="#08111F" />
      <Path
        d="M48 2c-8.836 0-16 7.164-16 16 0 11 16 28 16 28s16-17 16-28C64 9.164 56.836 2 48 2Z"
        fill="#FF6B35"
      />
      <Circle cx={48} cy={18} r={6} fill="#08111F" />
    </Svg>
  );
}
