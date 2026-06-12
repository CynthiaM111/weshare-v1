// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.up': 'keyboard-arrow-up',
  plus: 'add',
  'plus.circle': 'add-circle',
  'plus.circle.fill': 'add-circle',
  person: 'person',
  'person.fill': 'person',
  'person.2': 'people',
  'person.2.fill': 'groups',
  'person.badge.plus': 'person-add',
  'person.crop.circle': 'account-circle',
  'person.crop.circle.badge.plus': 'person-add-alt-1',
  ticket: 'confirmation-number',
  pencil: 'edit',
  clock: 'schedule',
  'clock.fill': 'schedule',
  calendar: 'event',
  magnifyingglass: 'search',
  mappin: 'place',
  'car.fill': 'directions-car',
  'bus.fill': 'directions-bus',
  'location.fill': 'location-on',
  'gearshape.fill': 'settings',
  'circle.grid.2x2.fill': 'apps',
  'bell.fill': 'notifications',
  bell: 'notifications-none',
  'list.bullet.rectangle': 'format-list-bulleted',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',
  'arrow.forward': 'arrow-forward',
  'arrow.up.arrow.down': 'swap-vert',
  'arrow.up.left': 'north-west',
  checkmark: 'check',
  'checkmark.seal.fill': 'verified',
  'checkmark.circle.fill': 'check-circle',
  'xmark.circle.fill': 'cancel',
  'exclamationmark.circle.fill': 'error',
  'exclamationmark.triangle.fill': 'warning',
  'text.bubble.fill': 'chat-bubble',
  'phone.fill': 'phone',
  'camera.fill': 'photo-camera',
  'shield.fill': 'admin-panel-settings',
  'doc.text.fill': 'description',
  'lock.open.fill': 'lock-open',
} as const satisfies IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const materialName = MAPPING[name] ?? 'help-outline';
  return <MaterialIcons color={color} size={size} name={materialName} style={style} />;
}
