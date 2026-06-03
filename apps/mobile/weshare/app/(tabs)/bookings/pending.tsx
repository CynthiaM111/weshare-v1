import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ScreenSafeArea } from '@/components/ScreenSafeArea';

import { useColorScheme } from '@/hooks/use-color-scheme';

const NAVY = '#08111F';
const ACCENT = '#FF6B35';

/** Legacy route — redirects to Bookings with the card expanded. */
export default function BookingPendingRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? NAVY : '#F5F7FA';

  useEffect(() => {
    const bookingId = typeof params.bookingId === 'string' ? params.bookingId : '';
    router.replace({
      pathname: '/my-bookings',
      params: bookingId ? { expandBookingId: bookingId } : {},
    });
  }, [params.bookingId, router]);

  return (
    <ScreenSafeArea backgroundColor={bg}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    </ScreenSafeArea>
  );
}
