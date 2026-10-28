import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  visible: boolean;
  icon: IconName;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** "danger" pinta el botón y el ícono en rojo (eliminar, cerrar sesión). */
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Diálogo de confirmación con el estilo de la app (reemplaza al Alert del sistema). */
export function ConfirmDialog({
  visible,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const danger = tone === 'danger';
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={loading ? undefined : onCancel} accessibilityLabel="Cerrar">
        <Pressable style={styles.card} onPress={() => {}} accessibilityViewIsModal>
          <View style={[styles.iconCircle, { backgroundColor: danger ? 'rgba(248,113,113,0.14)' : 'rgba(56,189,248,0.14)' }]}>
            <Ionicons name={icon} size={30} color={danger ? Colors.dangerText : Colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="outline" onPress={onCancel} disabled={loading} style={styles.action} />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              loading={loading}
              style={[styles.action, danger && { backgroundColor: Colors.danger }]}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3,7,15,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text, textAlign: 'center' },
  message: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  action: { flex: 1, minHeight: 50 },
});
