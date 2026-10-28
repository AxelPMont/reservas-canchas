import Constants from 'expo-constants';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button, Card } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { IS_PRODUCTION } from '@/lib/env';
import { firebaseProjectId } from '@/lib/firebase';

export default function CuentaScreen() {
  const insets = useSafeAreaInsets();
  const { user, userProfile, isAdmin, signOut } = useAuth();
  const name = userProfile?.displayName ?? 'Usuario';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [askSignOut, setAskSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setAskSignOut(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title}>Cuenta</Text>

      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <View style={styles.role}>
          <Text style={styles.roleText}>{isAdmin ? 'Administrador' : 'Empleado'}</Text>
        </View>
      </Card>

      <View style={{ flex: 1 }} />

      <Button label="Cerrar sesión" icon="log-out-outline" variant="danger" onPress={() => setAskSignOut(true)} />
      <ConfirmDialog
        visible={askSignOut}
        icon="log-out-outline"
        tone="danger"
        title="¿Cerrar sesión?"
        message={`Saldrás de la cuenta de ${name}. Tendrás que ingresar tu correo y contraseña para volver a entrar.`}
        confirmLabel="Salir"
        loading={signingOut}
        onConfirm={doSignOut}
        onCancel={() => setAskSignOut(false)}
      />
      <Text style={styles.version}>
        Versión {Constants.expoConfig?.version}
        {IS_PRODUCTION ? '' : ` · DEV (${firebaseProjectId})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16, paddingBottom: 20, gap: 14 },
  title: { fontFamily: Fonts.display, fontSize: 26, color: Colors.text },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.display, fontSize: 20, color: Colors.primaryLight },
  name: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.text },
  email: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted },
  role: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: Colors.borderSoft, justifyContent: 'center' },
  roleText: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.textSecondary },
  version: { textAlign: 'center', fontFamily: Fonts.regular, fontSize: 12, color: Colors.textFaint },
});
