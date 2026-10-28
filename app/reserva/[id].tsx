import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button, Card, CourtBadge, EmptyState, formatMoney } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { friendlyError } from '@/lib/errors';
import { callPhone, formatPhone, openWhatsApp } from '@/lib/phone';
import { deleteReservation, subscribeReservation } from '@/lib/reservations';
import {
  formatDateForDisplay,
  formatDateLong,
  formatDuration,
  formatTimeRange,
  isReservationFinished,
  reservationRange,
  toISODate,
} from '@/lib/time-utils';
import { CLOSING_MINUTES, type Reservation } from '@/types/reservation';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = formatDateForDisplay(toISODate(d));
  const time = d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

export default function DetalleReservaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  useEffect(() => subscribeReservation(id, setReservation), [id]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.iconBtn}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Reserva</Text>
    </View>
  );

  if (reservation === undefined) {
    return (
      <View style={styles.container}>
        {header}
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 48 }} />
      </View>
    );
  }
  if (reservation === null) {
    return (
      <View style={styles.container}>
        {header}
        <EmptyState icon="trash-outline" title="Esta reserva fue eliminada" />
      </View>
    );
  }

  const r = reservation;
  const [, end] = reservationRange(r);
  const pastMidnight = end > CLOSING_MINUTES; // solo reservas antiguas
  const finished = isReservationFinished(r);
  const history = [...(r.history ?? [])].reverse();

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteReservation(r);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setAskDelete(false);
      router.back();
    } catch (e) {
      setAskDelete(false);
      Alert.alert('No se pudo eliminar', friendlyError(e));
    } finally {
      setDeleting(false);
    }
  };

  const whatsappMessage = `Hola ${r.clientName}, te confirmamos tu reserva en Sport Diamante: ${formatDateLong(r.date)}, ${formatTimeRange(r.startTime, r.durationMinutes)}, Cancha ${r.courtId}.`;

  return (
    <View style={styles.container}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={{ gap: 12, padding: 18 }}>
          <View style={styles.badges}>
            <CourtBadge courtId={r.courtId} />
            {pastMidnight && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>Pasa medianoche</Text>
              </View>
            )}
          </View>
          <Text style={styles.client}>{r.clientName}</Text>
          <View style={styles.grid2}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.label}>FECHA</Text>
              <Text style={styles.value}>{formatDateLong(r.date)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.label}>HORARIO</Text>
              <Text style={styles.value}>{formatTimeRange(r.startTime, r.durationMinutes)}</Text>
              <Text style={styles.muted}>{formatDuration(r.durationMinutes)}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.phoneCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>TELÉFONO</Text>
            <Text style={styles.value}>{r.phone ? formatPhone(r.phone) : 'Sin teléfono'}</Text>
          </View>
          {r.phone ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar confirmación por WhatsApp"
                onPress={() => openWhatsApp(r.phone!, whatsappMessage).catch(() => Alert.alert('No se pudo abrir WhatsApp'))}
                style={styles.whatsapp}
              >
                <Ionicons name="logo-whatsapp" size={18} color={Colors.depositText} />
                <Text style={styles.whatsappText}>WhatsApp</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Llamar"
                onPress={() => callPhone(r.phone!)}
                style={styles.callBtn}
              >
                <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
              </Pressable>
            </>
          ) : null}
        </Card>

        <Card style={styles.depositCard}>
          <View style={styles.depositIcon}>
            <Ionicons name="cash-outline" size={22} color={r.deposit ? Colors.deposit : Colors.textMuted} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.label}>ADELANTO</Text>
            {r.deposit ? (
              <>
                <Text style={styles.depositAmount}>S/ {formatMoney(r.deposit.amount)}</Text>
                <Text style={styles.muted}>
                  Registrado por {r.deposit.registeredByName} · {formatDateTime(r.deposit.registeredAt)}
                </Text>
              </>
            ) : (
              <Text style={styles.value}>Sin adelanto</Text>
            )}
          </View>
        </Card>

        {history.length > 0 && (
          <View style={{ gap: 10, paddingHorizontal: 4 }}>
            <Text style={styles.label}>HISTORIAL</Text>
            {history.map((h, i) => (
              <View key={`${h.at}-${i}`} style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: i === 0 ? Colors.primary : Colors.borderDashed }]} />
                <Text style={styles.historyText}>
                  <Text style={{ color: Colors.text, fontFamily: Fonts.bold }}>{h.byName}</Text>{' '}
                  {h.action === 'created' ? 'creó la reserva' : h.detail} · {formatDateTime(h.at)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 14 }]}>
        {finished ? (
          <View style={styles.finished}>
            <Ionicons name="checkmark-done" size={18} color={Colors.textSecondary} />
            <Text style={styles.finishedTitle}>Reserva finalizada</Text>
          </View>
        ) : (
          <Button label="Editar reserva" icon="create-outline" onPress={() => router.push(`/reserva/editar/${r.id}`)} />
        )}
        {isAdmin && (
          <Button label="Eliminar reserva" icon="trash-outline" variant="danger" onPress={() => setAskDelete(true)} />
        )}
      </View>

      <ConfirmDialog
        visible={askDelete}
        icon="trash-outline"
        tone="danger"
        title="¿Eliminar reserva?"
        message={`Se eliminará la reserva de ${r.clientName} del ${formatDateForDisplay(r.date)}, ${formatTimeRange(r.startTime, r.durationMinutes)}, Cancha ${r.courtId}. Esto no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={doDelete}
        onCancel={() => setAskDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 6 },
  headerTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: Colors.borderSoft,
  },
  tagText: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.textSecondary },
  client: { fontFamily: Fonts.displayHeavy, fontSize: 32, color: Colors.text, lineHeight: 34 },
  grid2: { flexDirection: 'row', gap: 12 },
  label: { fontFamily: Fonts.semibold, fontSize: 12, letterSpacing: 0.5, color: Colors.textMuted },
  value: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.text },
  muted: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  phoneCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whatsapp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(52,211,153,0.15)',
  },
  whatsappText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.depositText },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositCard: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  depositIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(52,211,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositAmount: { fontFamily: Fonts.displayHeavy, fontSize: 26, color: Colors.depositText },
  historyRow: { flexDirection: 'row', gap: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  historyText: { flex: 1, fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    backgroundColor: Colors.tabBar,
  },
  finished: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  finishedTitle: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text },
});
