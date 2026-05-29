import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert, ErrorUtils } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { CourtManagerColors } from '@/constants/theme';

// Captura errores antes de que el JS pueda mostrarlos — ayuda a debuggear crash silencioso en Android
if (__DEV__) {
  const prevHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GlobalError]', error?.message, '\n', error?.stack);
    if (isFatal) {
      Alert.alert(
        'Error fatal',
        `${error?.message}\n\n${error?.stack?.slice(0, 300)}`,
        [{ text: 'OK' }]
      );
    }
    prevHandler?.(error, isFatal);
  });
}

const CourtManagerDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: CourtManagerColors.primary,
    background: CourtManagerColors.background,
    card: CourtManagerColors.card,
    text: CourtManagerColors.text,
    border: CourtManagerColors.cardBorder,
  },
};

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)');
    }
  }, [user, loading, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={CourtManagerDarkTheme}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </ThemeProvider>
  );
}
