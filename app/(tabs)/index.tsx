import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourtManagerColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  createReservation,
  subscribeReservationsByDateAndCourt,
} from '@/lib/reservations';
import {
  DURATION_OPTIONS,
  START_HOURS,
  type CourtId,
  type ReservationForm,
} from '@/types/reservation';
import {
  getTodayISO,
  getNextDays,
  formatDateForDisplay,
  formatTimeRange,
  isSlotOccupied,
  getStartHoursForPicker,
} from '@/lib/time-utils';

export default function ReservarScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [courtId, setCourtId] = useState<CourtId>('1');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [occupiedReservations, setOccupiedReservations] = useState<Array<{ id: string; startTime: string; durationMinutes: number; clientName: string }>>([]);
  const [creating, setCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const dates = useMemo(() => getNextDays(14), []);
  const startHours = useMemo(() => getStartHoursForPicker(), []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeReservationsByDateAndCourt(
      selectedDate,
      courtId,
      (list) => {
        setOccupiedReservations(
          list.map((r) => ({
            id: r.id,
            startTime: r.startTime,
            durationMinutes: r.durationMinutes,
            clientName: r.clientName,
          }))
        );
      }
    );
    return () => unsub();
  }, [user, selectedDate, courtId]);

  const slotStatus = (slotStart: string) =>
    isSlotOccupied(slotStart, durationMinutes, occupiedReservations);

  const isComplete =
    selectedDate &&
    courtId &&
    durationMinutes &&
    startTime &&
    clientName.trim().length > 0;

  const selectedSlotStatus = startTime ? slotStatus(startTime) : null;
  const canConfirm = isComplete && selectedSlotStatus && !selectedSlotStatus.occupied;

  const handleConfirm = async () => {
    if (!user || !canConfirm) return;
    setCreating(true);
    try {
      const data: ReservationForm = {
        date: selectedDate,
        courtId,
        startTime: startTime!,
        durationMinutes,
        clientName: clientName.trim(),
      };
      await createReservation(user.uid, data);
      setShowSuccess(true);
      setClientName('');
      setStartTime(null);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear la reserva');
    } finally {
      setCreating(false);
    }
  };

  const durationLabel = DURATION_OPTIONS.find((d) => d.minutes === durationMinutes)?.label ?? '';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Fecha */}
        <View style={styles.section}>
          <Ionicons name="calendar-outline" size={20} color={CourtManagerColors.primary} />
          <Text style={styles.sectionLabel}>Fecha</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateStrip}
          contentContainerStyle={styles.dateStripContent}
        >
          {dates.map((d) => (
            <TouchableOpacity
              key={d.date}
              style={[styles.dateChip, selectedDate === d.date && styles.dateChipSelected]}
              onPress={() => setSelectedDate(d.date)}
            >
              <Text style={[styles.dateChipText, selectedDate === d.date && styles.dateChipTextSelected]}>
                {d.label}
              </Text>
              {selectedDate === d.date && <View style={styles.dateChipDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cancha */}
        <View style={styles.section}>
          <Ionicons name="location-outline" size={20} color={CourtManagerColors.primary} />
          <Text style={styles.sectionLabel}>Cancha</Text>
        </View>
        <View style={styles.row}>
          {(['1', '2'] as CourtId[]).map((id) => (
            <TouchableOpacity
              key={id}
              style={[styles.courtChip, courtId === id && styles.courtChipSelected]}
              onPress={() => { setCourtId(id); setStartTime(null); }}
            >
              <View style={[styles.courtDot, id === '1' && styles.courtDot1, id === '2' && styles.courtDot2]} />
              <Text style={styles.courtChipText}>Cancha {id}</Text>
              {courtId === id && (
                <Ionicons name="checkmark-circle" size={22} color={CourtManagerColors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Duración */}
        <View style={styles.section}>
          <Ionicons name="time-outline" size={20} color={CourtManagerColors.primary} />
          <Text style={styles.sectionLabel}>Duración</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.durationStrip}
          contentContainerStyle={styles.durationStripContent}
        >
          {DURATION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.minutes}
              style={[styles.durationChip, durationMinutes === opt.minutes && styles.durationChipSelected]}
              onPress={() => setDurationMinutes(opt.minutes)}
            >
              <Text style={[styles.durationChipText, durationMinutes === opt.minutes && styles.durationChipTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hora de inicio */}
        <View style={styles.section}>
          <Ionicons name="time-outline" size={20} color={CourtManagerColors.primary} />
          <Text style={styles.sectionLabel}>Hora de inicio</Text>
          <View style={styles.occupiedLegend}>
            <View style={styles.occupiedDot} />
            <Text style={styles.occupiedLegendText}>Ocupado</Text>
          </View>
        </View>
        <View style={styles.timeGrid}>
          {startHours.map((t) => {
            const status = slotStatus(t);
            const selected = startTime === t;
            const disabled = status.occupied;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.timeChip,
                  disabled && styles.timeChipOccupied,
                  selected && !disabled && styles.timeChipSelected,
                ]}
                onPress={() => !disabled && setStartTime(t)}
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    disabled && styles.timeChipTextOccupied,
                    selected && !disabled && styles.timeChipTextSelected,
                  ]}
                >
                  {formatTimeForChip(t)}
                </Text>
                {status.occupied && status.clientName && (
                  <Text style={styles.timeChipSubtext} numberOfLines={1}>{status.clientName}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nombre del cliente */}
        <View style={styles.section}>
          <Ionicons name="person-outline" size={20} color={CourtManagerColors.primary} />
          <Text style={styles.sectionLabel}>Nombre del cliente</Text>
        </View>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={20} color={CourtManagerColors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Nombre del cliente"
            placeholderTextColor={CourtManagerColors.textMuted}
            value={clientName}
            onChangeText={setClientName}
          />
        </View>

        {/* Resumen */}
        {(selectedDate && courtId && startTime && durationMinutes) && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>RESUMEN</Text>
            <Text style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fecha: </Text>
              {formatDateForDisplay(selectedDate)}
            </Text>
            <Text style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cancha: </Text>
              Cancha {courtId}
            </Text>
            <Text style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Horario: </Text>
              {formatTimeRange(startTime, durationMinutes)}
            </Text>
            <Text style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duración: </Text>
              {durationLabel}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.confirmButton, canConfirm && styles.confirmButtonActive]}
          onPress={handleConfirm}
          disabled={!canConfirm || creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark"
                size={22}
                color={canConfirm ? '#fff' : CourtManagerColors.textMuted}
              />
              <Text
                style={[
                  styles.confirmButtonText,
                  canConfirm && styles.confirmButtonTextActive,
                ]}
              >
                Confirmar Reserva
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={64} color="#fff" />
            </View>
            <Text style={styles.successTitle}>¡Reserva creada!</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatTimeForChip(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (h === 0) return '12:00 AM';
  if (h === 12) return '12:00 PM';
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`;
  return `${h - 12}:${String(m).padStart(2, '0')} PM`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CourtManagerColors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: CourtManagerColors.text },
  occupiedLegend: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 6 },
  occupiedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CourtManagerColors.occupied },
  occupiedLegendText: { fontSize: 12, color: CourtManagerColors.occupied },
  dateStrip: { marginBottom: 20 },
  dateStripContent: { gap: 10, paddingVertical: 4 },
  dateChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: CourtManagerColors.card,
    minWidth: 72,
    alignItems: 'center',
  },
  dateChipSelected: { backgroundColor: CourtManagerColors.primary },
  dateChipText: { color: CourtManagerColors.text, fontWeight: '600', fontSize: 14 },
  dateChipTextSelected: { color: '#fff' },
  dateChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  courtChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: CourtManagerColors.card,
  },
  courtChipSelected: { backgroundColor: CourtManagerColors.card, borderWidth: 2, borderColor: CourtManagerColors.primary },
  courtDot: { width: 10, height: 10, borderRadius: 5 },
  courtDot1: { backgroundColor: CourtManagerColors.primary },
  courtDot2: { backgroundColor: CourtManagerColors.futureAccent },
  courtChipText: { color: CourtManagerColors.text, fontWeight: '600', fontSize: 15 },
  durationStrip: { marginBottom: 20 },
  durationStripContent: { gap: 10, paddingVertical: 4 },
  durationChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: CourtManagerColors.card,
  },
  durationChipSelected: { backgroundColor: CourtManagerColors.primary },
  durationChipText: { color: CourtManagerColors.text, fontWeight: '600', fontSize: 14 },
  durationChipTextSelected: { color: '#fff' },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  timeChip: {
    width: '31%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: CourtManagerColors.card,
    alignItems: 'center',
  },
  timeChipOccupied: { backgroundColor: CourtManagerColors.dangerBg },
  timeChipSelected: { backgroundColor: CourtManagerColors.primary },
  timeChipText: { color: CourtManagerColors.text, fontWeight: '600', fontSize: 13 },
  timeChipTextOccupied: { color: CourtManagerColors.occupied },
  timeChipTextSelected: { color: '#fff' },
  timeChipSubtext: { fontSize: 10, color: CourtManagerColors.textMuted, marginTop: 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CourtManagerColors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    color: CourtManagerColors.text,
    fontSize: 16,
    paddingVertical: 14,
  },
  summary: {
    backgroundColor: CourtManagerColors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: CourtManagerColors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  summaryRow: { fontSize: 14, color: CourtManagerColors.text, marginBottom: 6 },
  summaryLabel: { color: CourtManagerColors.textMuted },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: CourtManagerColors.card,
  },
  confirmButtonActive: { backgroundColor: CourtManagerColors.primary },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: CourtManagerColors.textMuted },
  confirmButtonTextActive: { color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { alignItems: 'center' },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: CourtManagerColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
});
