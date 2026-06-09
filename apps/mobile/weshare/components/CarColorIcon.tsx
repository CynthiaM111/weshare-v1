import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { carColorToHex } from '@/lib/car-colors';

type Props = {
  color: string;
  size?: number;
};

export function CarColorIcon({ color, size = 36 }: Props) {
  const hex = carColorToHex(color);
  const iconSize = Math.round(size * 0.55);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: hex + '22',
          borderColor: hex + '55',
        },
      ]}
    >
      <IconSymbol name="car.fill" size={iconSize} color={hex} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
