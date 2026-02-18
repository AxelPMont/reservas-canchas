import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourtManagerColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();

  const handleLogin = async () => {
    setError('');
    if (!usuario.trim() || !password) {
      setError('Completa usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      await signIn(usuario.trim(), password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!nombreCompleto.trim() || !usuario.trim() || !password) {
      setError('Completa todos los campos');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const email = usuario.includes('@') ? usuario.trim() : `${usuario.trim()}@courtmanager.local`;
      await signUp(email, password, nombreCompleto.trim(), usuario.trim());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear la cuenta';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Ionicons name="shield-checkmark" size={40} color="#fff" />
        </View>
        <Text style={styles.title}>CourtManager</Text>
        <Text style={styles.subtitle}>Gestión de canchas deportivas</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'login' && styles.tabActive]}
            onPress={() => { setTab('login'); setError(''); }}
          >
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
              Iniciar sesión
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'register' && styles.tabActive]}
            onPress={() => { setTab('register'); setError(''); }}
          >
            <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
              Registrarse
            </Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {tab === 'login' ? (
          <>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={CourtManagerColors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Usuario (email)"
                placeholderTextColor={CourtManagerColors.textMuted}
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={CourtManagerColors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor={CourtManagerColors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={CourtManagerColors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Entrar</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('register')} style={styles.linkWrap}>
              <Text style={styles.linkText}>¿No tienes cuenta? </Text>
              <Text style={styles.link}>Regístrate</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={CourtManagerColors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={CourtManagerColors.textMuted}
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={CourtManagerColors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Usuario (email o nombre de usuario)"
                placeholderTextColor={CourtManagerColors.textMuted}
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={CourtManagerColors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor={CourtManagerColors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={CourtManagerColors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Crear cuenta</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('login')} style={styles.linkWrap}>
              <Text style={styles.linkText}>¿Ya tienes cuenta? </Text>
              <Text style={styles.link}>Inicia sesión</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CourtManagerColors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: CourtManagerColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: CourtManagerColors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: CourtManagerColors.textMuted,
  },
  panel: {
    backgroundColor: CourtManagerColors.card,
    borderRadius: 16,
    padding: 20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: CourtManagerColors.primary,
  },
  tabText: {
    color: CourtManagerColors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  error: {
    color: CourtManagerColors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CourtManagerColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    color: CourtManagerColors.text,
    fontSize: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CourtManagerColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  linkWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: {
    color: CourtManagerColors.textMuted,
    fontSize: 14,
  },
  link: {
    color: CourtManagerColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
