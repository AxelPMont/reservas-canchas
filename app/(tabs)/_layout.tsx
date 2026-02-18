import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CourtManagerColors } from '@/constants/theme';
import { HeaderLogoutButton } from '@/components/header-logout-button';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: CourtManagerColors.background },
        headerTintColor: CourtManagerColors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
        headerRight: () => <HeaderLogoutButton />,
        tabBarStyle: {
          backgroundColor: CourtManagerColors.surface,
          borderTopColor: CourtManagerColors.cardBorder,
        },
        tabBarActiveTintColor: CourtManagerColors.primary,
        tabBarInactiveTintColor: CourtManagerColors.tabInactive,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Reservar Cancha',
          tabBarLabel: 'Reservar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mis-reservas"
        options={{
          title: 'Mis Reservas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
