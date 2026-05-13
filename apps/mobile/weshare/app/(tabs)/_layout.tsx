import { Tabs } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const c = Colors[scheme];

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
        options={{ title: 'My Rides', tabBarIcon: ({ color }) => <TabIcon name="list.bullet" color={color} /> }}
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

function TabIcon({ name, color }: { name: any; color: string }) {
  return <IconSymbol name={name} size={22} color={color} />;
}
