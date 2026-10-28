import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowSemiCondensed_700Bold,
  BarlowSemiCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-semi-condensed';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { EnvBanner } from '@/components/env-banner';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { pruneCache } from '@/lib/reservations-cache';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SportDiamanteTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.borderSoft,
  },
};

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading || !fontsReady) return;
    SplashScreen.hideAsync().catch(() => {});
    const inAuth = segments[0] === '(auth)';
    const atRoot = (segments as string[]).length === 0;
    if (user && (inAuth || atRoot)) router.replace('/(tabs)');
    if (!user && !inAuth) router.replace('/(auth)');
  }, [user, loading, fontsReady, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="reserva/nueva" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="reserva/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="reserva/editar/[id]" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowSemiCondensed_700Bold,
    BarlowSemiCondensed_800ExtraBold,
  });

  useEffect(() => {
    pruneCache();
  }, []);

  return (
    <ThemeProvider value={SportDiamanteTheme}>
      <AuthProvider>
        <RootNavigator fontsReady={fontsLoaded || !!fontError} />
        <EnvBanner />
        <StatusBar style="light" />
      </AuthProvider>
    </ThemeProvider>
  );
}
