import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Field, SectionTitle, Toggle, formatMoney } from '@/components/ui';
import { Colors, CourtColors, Fonts, Radius } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { showAlert } from '@/lib/alert';
import { pickContactPhone } from '@/lib/contacts';
import { pickDate } from '@/lib/date-picker';
import { friendlyError } from '@/lib/errors';
import { formatPhone } from '@/lib/phone';
import {
  createReservation,
  searchClients,
  subscribeDay,
  updateReservation,
  type ClientSuggestion,
} from '@/lib/reservations';
import {
  fitsBeforeClosing,
  formatDateForDisplay,
  formatDuration,
  formatTimeForChip,
  formatTimeRange,
  isSlotOccupied,
  rangesOverlap,
  reservationRange,
  timeToMinutes,
} from '@/lib/time-utils';
import {
  COURTS,
  CLOSING_MINUTES,
  DURATION_STEP,
  MAX_DURATION,
  MIN_DURATION,
  START_HOURS,
  type CourtId,
  type Reservation,
  type ReservationForm as FormData,
} from '@/types/reservation';

type Period = 'morning' | 'afternoon' | 'night';
const PERIODS: { id: Period; label: string; from: number; to: number }[] = [
  { id: 'morning', label: 'Mañana', from: 0, to: 12 * 60 },
  { id: 'afternoon', label: 'Tarde', from: 12 * 60, to: 18 * 60 },
  { id: 'night', label: 'Noche', from: 18 * 60, to: CLOSING_MINUTES },
];

type SlotKind = 'free' | 'busy' | 'short' | 'selected';

function periodFor(minutes: number): Period {
  if (minutes < 12 * 60) return 'morning';
  if (minutes < 18 * 60) return 'afternoon';
  return 'night';
}

type Props = {
  mode: 'create' | 'edit';
  initial: { date: string; courtId: CourtId; startTime?: string | null; durationMinutes?: number };
  editing?: Reservation;
};

export function ReservationFormScreen({ mode, initial, editing }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { actor } = useAuth();

  const [date, setDate] = useState(editing?.date ?? initial.date);
  const [courtId, setCourtId] = useState<CourtId>(editing?.courtId ?? initial.courtId);
  const [duration, setDuration] = useState(editing?.durationMinutes ?? initial.durationMinutes ?? 60);
  const [startTime, setStartTime] = useState<string | null>(editing?.startTime ?? initial.startTime ?? null);
  const [clientName, setClientName] = useState(editing?.clientName ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [depositOn, setDepositOn] = useState((editing?.deposit?.amount ?? 0) > 0);
  const [depositText, setDepositText] = useState(editing?.deposit?.amount ? String(editing.deposit.amount) : '');
  const [period, setPeriod] = useState<Period>(() =>
    periodFor(startTime ? timeToMinutes(startTime) : new Date().getHours() * 60)
  );
  const [focus, setFocus] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [dayReservations, setDayReservations] = useState<Reservation[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeDay(date, setDayReservations), [date]);

  const others = useMemo(
    () => dayReservations.filter((r) => r.courtId === courtId && r.id !== editing?.id),
    [dayReservations, courtId, editing?.id]
  );

  const slotKind = (t: string): { kind: SlotKind; sub?: string } => {
    const start = timeToMinutes(t);
    const blocking = others.find((r) => rangesOverlap([start, start + 30], reservationRange(r)));
    if (blocking) return { kind: 'busy', sub: blocking.clientName };
    if (!fitsBeforeClosing(t, duration)) return { kind: 'short', sub: 'cierra 12 AM' };
    if (isSlotOccupied(t, duration, others).occupied) return { kind: 'short', sub: 'no alcanza' };
    return { kind: t === startTime ? 'selected' : 'free' };
  };

  // Si al cambiar fecha, cancha o duración la hora elegida deja de estar libre, se desmarca.
  const selectedKind = startTime ? slotKind(startTime).kind : null;
  useEffect(() => {
    if (startTime && selectedKind !== 'selected') setStartTime(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKind]);

  // Autocompletar clientes mientras se escribe el nombre.
  useEffect(() => {
    if (focus !== 'client' || clientName.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      searchClients(clientName)
        .then((list) => setSuggestions(list.filter((s) => s.name !== clientName.trim())))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [clientName, focus]);

  const importContact = async () => {
    try {
      const picked = await pickContactPhone();
      if (!picked) return;
      setPhone(picked.phone);
      if (!clientName.trim() && picked.name) setClientName(picked.name);
    } catch {
      showAlert('No se pudo abrir los contactos');
    }
  };

  const depositAmount = depositOn ? Number(depositText.replace(',', '.')) : null;
  const depositInvalid = depositOn && !(depositAmount != null && depositAmount > 0);
  const canSave = !!startTime && clientName.trim().length > 0 && !depositInvalid && !saving;

  const save = async () => {
    if (!actor || !startTime) return;
    const form: FormData = {
      date,
      courtId,
      startTime,
      durationMinutes: duration,
      clientName: clientName.trim(),
      phone: phone.trim(),
      depositAmount: depositOn ? depositAmount : null,
    };
    setSaving(true);
    try {
      if (mode === 'edit' && editing) {
        await updateReservation(actor, editing, form);
      } else {
        await createReservation(actor, form);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert('No se pudo guardar', friendlyError(e, 'No se pudo guardar la reserva.'));
    } finally {
      setSaving(false);
    }
  };

  const visibleSlots = START_HOURS.filter((t) => {
    const m = timeToMinutes(t);
    const p = PERIODS.find((x) => x.id === period)!;
    return m >= p.from && m < p.to;
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{mode === 'edit' ? 'Editar reserva' : 'Nueva reserva'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.row2}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Fecha: ${formatDateForDisplay(date)}. Cambiar`}
            onPress={() => pickDate(date, setDate)}
            style={styles.box}
          >
            <Text style={styles.boxLabel}>FECHA</Text>
            <View style={styles.boxValueRow}>
              <Text style={styles.boxValue}>{formatDateForDisplay(date)}</Text>
              <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
            </View>
          </Pressable>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>DURACIÓN</Text>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Menos tiempo"
                disabled={duration <= MIN_DURATION}
                onPress={() => setDuration((d) => Math.max(MIN_DURATION, d - DURATION_STEP))}
                style={[styles.stepBtn, duration <= MIN_DURATION && { opacity: 0.4 }]}
              >
                <Ionicons name="remove" size={16} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.boxValue}>{formatDuration(duration)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Más tiempo"
                disabled={duration >= MAX_DURATION}
                onPress={() => setDuration((d) => Math.min(MAX_DURATION, d + DURATION_STEP))}
                style={[styles.stepBtn, duration >= MAX_DURATION && { opacity: 0.4 }]}
              >
                <Ionicons name="add" size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Cancha">
          {COURTS.map((c) => {
            const selected = c === courtId;
            return (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setCourtId(c)}
                style={[styles.segmentBtn, selected && { backgroundColor: CourtColors[c].solid }]}
              >
                <View style={[styles.dot, { backgroundColor: selected ? Colors.background : CourtColors[c].solid }]} />
                <Text style={[styles.segmentText, { color: selected ? Colors.background : Colors.textSecondary }]}>
                  Cancha {c}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <SectionTitle right={<Text style={styles.hint}>para {formatDuration(duration)}</Text>}>Hora de inicio</SectionTitle>
          <View style={styles.periods}>
            {PERIODS.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: period === p.id }}
                onPress={() => setPeriod(p.id)}
                style={[styles.periodBtn, period === p.id && styles.periodBtnActive]}
              >
                <Text style={[styles.periodText, period === p.id && { color: Colors.text, fontFamily: Fonts.bold }]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <SlotGrid slots={visibleSlots} kindOf={slotKind} onPick={setStartTime} />
          <View style={styles.legend}>
            <Legend style={{ backgroundColor: 'rgba(248,113,113,0.25)', borderColor: Colors.danger, borderWidth: 1 }} text="Ocupado" />
            <Legend style={{ borderColor: Colors.borderDashed, borderWidth: 1, borderStyle: 'dashed' }} text="No alcanza" />
            <Legend style={{ backgroundColor: Colors.primary }} text="Elegido" />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Cliente</SectionTitle>
          <View>
            <Field
              icon="person-outline"
              placeholder="Nombre del cliente o equipo"
              value={clientName}
              onChangeText={setClientName}
              autoCapitalize="words"
              focused={focus === 'client'}
              onFocus={() => setFocus('client')}
              onBlur={() => setTimeout(() => setFocus((f) => (f === 'client' ? null : f)), 150)}
              maxLength={80}
            />
            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map((s) => (
                  <Pressable
                    key={s.name}
                    accessibilityRole="button"
                    onPress={() => {
                      setClientName(s.name);
                      if (s.phone && !phone) setPhone(s.phone);
                      setSuggestions([]);
                      setFocus(null);
                    }}
                    style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: Colors.surfaceRaised }]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{s.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionName}>{s.name}</Text>
                      <Text style={styles.suggestionSub}>
                        {[s.phone ? formatPhone(s.phone) : null, `${s.reservationsCount} reservas`].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <Field
            icon="call-outline"
            placeholder="Teléfono (opcional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            focused={focus === 'phone'}
            onFocus={() => setFocus('phone')}
            onBlur={() => setFocus(null)}
            maxLength={20}
            right={
              // En la web no hay acceso a los contactos del celular.
              Platform.OS !== 'web' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Importar teléfono desde contactos"
                onPress={importContact}
                hitSlop={8}
                style={styles.contactBtn}
              >
                <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
                <Text style={styles.contactBtnText}>Contactos</Text>
              </Pressable>
              )
            }
          />
        </View>

        <Card style={{ gap: 12 }}>
          <View style={styles.toggleRow}>
            <View style={styles.depositIcon}>
              <Ionicons name="cash-outline" size={20} color={Colors.deposit} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Dejó adelanto</Text>
              <Text style={styles.toggleSub}>Opcional · se puede agregar después</Text>
            </View>
            <Toggle value={depositOn} onChange={setDepositOn} label="Dejó adelanto" />
          </View>
          {depositOn && (
            <Field
              label="Monto"
              prefix="S/"
              placeholder="0.00"
              value={depositText}
              onChangeText={(t) => setDepositText(t.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              focused={focus === 'deposit'}
              onFocus={() => setFocus('deposit')}
              onBlur={() => setFocus(null)}
              style={{ fontFamily: Fonts.bold, fontSize: 20 }}
            />
          )}
          {depositOn && depositInvalid && depositText.length > 0 && (
            <Text style={styles.errorText}>Ingresa un monto mayor a 0.</Text>
          )}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        {startTime ? (
          <View style={styles.summary}>
            <View style={[styles.courtTag, { backgroundColor: CourtColors[courtId].solid }]}>
              <Text style={styles.courtTagText}>C{courtId}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryMain}>
                {formatDateForDisplay(date)} · {formatTimeRange(startTime, duration)}
              </Text>
              <Text style={styles.summarySub} numberOfLines={1}>
                {[
                  clientName.trim() || 'Falta el nombre del cliente',
                  depositOn && depositAmount ? `adelanto S/ ${formatMoney(depositAmount)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.summarySub}>Elige una hora de inicio libre.</Text>
        )}
        <Button
          label={mode === 'edit' ? 'Guardar cambios' : 'Confirmar reserva'}
          icon="checkmark"
          onPress={save}
          disabled={!canSave}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function SlotGrid({
  slots,
  kindOf,
  onPick,
}: {
  slots: readonly string[];
  kindOf: (t: string) => { kind: SlotKind; sub?: string };
  onPick: (t: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {slots.map((t) => {
        const { kind, sub } = kindOf(t);
        const s = slotStyles[kind];
        const enabled = kind === 'free' || kind === 'selected';
        return (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled, selected: kind === 'selected' }}
            accessibilityLabel={`${formatTimeForChip(t)}${sub ? `, ${sub}` : ''}`}
            disabled={!enabled}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onPick(t);
            }}
            style={[styles.slot, s.box]}
          >
            <Text style={[styles.slotTime, { color: s.color }]}>{formatTimeForChip(t).replace(/ (AM|PM)/, '')}</Text>
            <Text style={[styles.slotSub, { color: s.color }]} numberOfLines={1}>
              {sub ?? formatTimeForChip(t).slice(-2)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Legend({ style, text }: { style: object; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, style]} />
      <Text style={styles.hint}>{text}</Text>
    </View>
  );
}

const slotStyles: Record<SlotKind, { box: object; color: string }> = {
  free: { box: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface }, color: Colors.text },
  busy: {
    box: { borderWidth: 1, borderColor: 'rgba(248,113,113,0.6)', backgroundColor: 'rgba(248,113,113,0.14)' },
    color: Colors.dangerText,
  },
  short: { box: { borderWidth: 1, borderColor: Colors.borderDashed, borderStyle: 'dashed' }, color: Colors.textFaint },
  selected: { box: { backgroundColor: Colors.primary }, color: Colors.onPrimary },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  headerTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 22, paddingBottom: 32 },
  row2: { flexDirection: 'row', gap: 10 },
  box: {
    flex: 1,
    minHeight: 66,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 4,
  },
  boxLabel: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.textMuted },
  boxValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boxValue: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: -10,
  },
  segmentBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  segmentText: { fontFamily: Fonts.display, fontSize: 17 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  section: { gap: 12 },
  hint: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  periods: { flexDirection: 'row', gap: 6 },
  periodBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodBtnActive: { backgroundColor: Colors.borderSoft, borderColor: Colors.borderSoft },
  periodText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '23%',
    flexGrow: 1,
    maxWidth: '24%',
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  slotTime: { fontFamily: Fonts.bold, fontSize: 15 },
  slotSub: { fontFamily: Fonts.semibold, fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  suggestions: {
    marginTop: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
    overflow: 'hidden',
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.primaryLight },
  suggestionName: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text },
  suggestionSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  contactBtnText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  depositIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(52,211,153,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.text },
  toggleSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  errorText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.dangerText },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    backgroundColor: Colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  courtTag: { height: 26, paddingHorizontal: 10, borderRadius: 8, justifyContent: 'center' },
  courtTagText: { fontFamily: Fonts.displayHeavy, fontSize: 13, color: Colors.background },
  summaryMain: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text },
  summarySub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
});
