import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ReservationFormScreen } from '@/components/reservation-form';
import { EmptyState } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { subscribeReservation } from '@/lib/reservations';
import { isReservationFinished } from '@/lib/time-utils';
import type { Reservation } from '@/types/reservation';

export default function EditarReservaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined);

  // Se toma una sola vez: el formulario no debe cambiar mientras se edita.
  useEffect(() => {
    const unsub = subscribeReservation(id, (r) => {
      setReservation((prev) => (prev === undefined ? r : prev));
    });
    return unsub;
  }, [id]);

  if (reservation === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }
  if (reservation === null) {
    return (
      <View style={styles.center}>
        <EmptyState icon="alert-circle-outline" title="La reserva ya no existe" />
      </View>
    );
  }
  if (isReservationFinished(reservation)) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="lock-closed-outline"
          title="Esta reserva ya terminó"
          subtitle="Las reservas finalizadas no se pueden editar."
        />
      </View>
    );
  }
  return (
    <ReservationFormScreen
      mode="edit"
      editing={reservation}
      initial={{ date: reservation.date, courtId: reservation.courtId }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
});
