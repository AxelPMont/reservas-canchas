import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Field } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { friendlyError } from '@/lib/errors';

const logo = require('@/assets/images/logo-sport-diamante.png');

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState<'email' | 'pass' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Completa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(friendlyError(e, 'No se pudo iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Sport Diamante" />
          <Text style={styles.tagline}>AGENDA DE CANCHAS</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Correo"
            icon="mail-outline"
            placeholder="empleado@correo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            focused={focus === 'email'}
            onFocus={() => setFocus('email')}
            onBlur={() => setFocus(null)}
          />
          <Field
            label="Contraseña"
            icon="lock-closed-outline"
            placeholder="Tu contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            onSubmitEditing={handleLogin}
            focused={focus === 'pass'}
            onFocus={() => setFocus('pass')}
            onBlur={() => setFocus(null)}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={12}
                style={styles.eye}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.textMuted} />
              </Pressable>
            }
          />

          {error ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle-outline" size={18} color={Colors.dangerText} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button label="Entrar" icon="arrow-forward" onPress={handleLogin} loading={loading} style={{ marginTop: 8 }} />
          <Text style={styles.hint}>La sesión queda iniciada en este celular.</Text>
        </View>

        <Text style={styles.footer}>
          v{Constants.expoConfig?.version ?? '2.0'} · Solo personal autorizado
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  header: { alignItems: 'center' },
  logo: { width: 240, height: 240 },
  tagline: {
    fontFamily: Fonts.display,
    fontSize: 15,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginTop: -16,
  },
  form: { marginTop: 36, gap: 16 },
  eye: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  errorText: { flex: 1, color: Colors.dangerText, fontFamily: Fonts.medium, fontSize: 14 },
  hint: { textAlign: 'center', color: Colors.textMuted, fontFamily: Fonts.regular, fontSize: 13 },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
    textAlign: 'center',
    color: Colors.textFaint,
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
});
