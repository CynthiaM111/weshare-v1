import { useColorScheme } from './use-color-scheme';
import { Colors } from '@/constants/theme';

type ThemeKey = keyof typeof Colors.light;

type ThemeTint = { light?: string; dark?: string };

export function useThemeColor(props: ThemeTint, colorName: ThemeKey): string;
export function useThemeColor(colorName: ThemeKey): string;
export function useThemeColor(
  propsOrKey: ThemeTint | ThemeKey,
  colorName?: ThemeKey
): string {
  const scheme = useColorScheme();

  if (typeof propsOrKey === 'string') {
    return Colors[scheme][propsOrKey];
  }

  const props = propsOrKey;
  const key = colorName!;
  const hasAnyTint = props.light !== undefined || props.dark !== undefined;

  if (hasAnyTint) {
    return scheme === 'dark'
      ? (props.dark ?? Colors.dark[key])
      : (props.light ?? Colors.light[key]);
  }

  return Colors[scheme][key];
}

export function useThemeColors() {
  const scheme = useColorScheme();
  return Colors[scheme];
}
