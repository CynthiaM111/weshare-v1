import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { getDriverBookingCounts, type DriverBookingCounts } from '@/lib/bookings';

const NAVY = '#08111F';
const BADGE_PENDING = '#F5C842';
const BADGE_CONFIRMED = '#22C55E';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const c = Colors[scheme];
  const { session } = useSession();
  const [driverCounts, setDriverCounts] = useState<DriverBookingCounts>({ pending: 0, confirmed: 0 });

  const refreshDriverCounts = useCallback(async () => {
    if (!session?.userId) {
      setDriverCounts({ pending: 0, confirmed: 0 });
      return;
    }
    try {
      const counts = await getDriverBookingCounts(session.userId);
      setDriverCounts(counts);
    } catch {
      setDriverCounts({ pending: 0, confirmed: 0 });
    }
  }, [session?.userId]);

  useFocusEffect(
    useCallback(() => {
      void refreshDriverCounts();
    }, [refreshDriverCounts])
  );

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: c.subText,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.hairline,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Find Ride', tabBarIcon: ({ color }) => <TabIcon name="magnifyingglass" color={color} /> }}
      />
      <Tabs.Screen
        name="post-ride"
        options={{ title: 'Post Ride', tabBarIcon: ({ color }) => <TabIcon name="plus.circle" color={color} /> }}
      />
      <Tabs.Screen
        name="my-rides"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ color }) => (
            <MyRidesTabIcon color={color} pending={driverCounts.pending} confirmed={driverCounts.confirmed} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-bookings"
        options={{ title: 'Bookings', tabBarIcon: ({ color }) => <TabIcon name="ticket" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabIcon name="person" color={color} /> }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="search-home" options={{ href: null }} />
      <Tabs.Screen name="find-ride" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="rides/[id]" options={{ href: null }} />
      <Tabs.Screen name="edit-ride/[id]" options={{ href: null }} />
      <Tabs.Screen name="bookings/confirm" options={{ href: null }} />
      <Tabs.Screen name="bookings/pending" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: ComponentProps<typeof IconSymbol>['name']; color: string }) {
  return <IconSymbol name={name} size={22} color={color} />;
}

function MyRidesTabIcon({
  color,
  pending,
  confirmed,
}: {
  color: string;
  pending: number;
  confirmed: number;
}) {
  return (
    <View style={badgeStyles.wrap}>
      <IconSymbol name="car.fill" size={22} color={color} />
      {(pending > 0 || confirmed > 0) && (
        <View style={badgeStyles.pillRow}>
          {pending > 0 && (
            <View style={[badgeStyles.pill, { backgroundColor: BADGE_PENDING }]}>
              <Text style={badgeStyles.pillText}>{pending > 99 ? '99+' : pending}</Text>
            </View>
          )}
          {confirmed > 0 && (
            <View style={[badgeStyles.pill, { backgroundColor: BADGE_CONFIRMED }]}>
              <Text style={badgeStyles.pillText}>{confirmed > 99 ? '99+' : confirmed}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', minHeight: 28 },
  pillRow: { flexDirection: 'row', gap: 3, marginTop: 2 },
  pill: {
    minWidth: 16,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: 9, fontWeight: '900', color: NAVY, lineHeight: 11 },
});
