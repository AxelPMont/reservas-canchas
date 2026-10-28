import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, CourtColors, Fonts, Radius } from '@/constants/theme';
import { pickDate } from '@/lib/date-picker';
import { subscribeDay } from '@/lib/reservations';
import {
  addDaysISO,
  dayOfMonth,
  dayOfWeekShort,
  formatDateLong,
  formatTimeForChip,
  formatTimeRange,
  getTodayISO,
  getDaysFrom,
  minutesNowInDay,
  minutesToTime,
  reservationRange,
} from '@/lib/time-utils';
import {
  CLOSING_MINUTES,
  COURTS,
  OPENING_MINUTES,
  type CourtId,
  type Reservation,
} from '@/types/reservation';

const logo = require('@/assets/images/icon.png');

/** Alto de una hora en la línea de tiempo. */
const HOUR_H = 64;
const TIME_COL = 52;
const STRIP_DAYS = 21;

const yFor = (minutes: number) => ((minutes - OPENING_MINUTES) / 60) * HOUR_H;
const hoursUntil = (end: number) =>
  Array.from({ length: Math.ceil((end - OPENING_MINUTES) / 60) + 1 }, (_, i) => OPENING_MINUTES + i * 60);

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const today = getTodayISO();
  const [date, setDate] = useState(today);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setReservations([]);
    return subscribeDay(date, setReservations);
  }, [date]);

  const nowMinutes = minutesNowInDay(date, now);

  // Al cambiar de día, centra la vista en la hora actual (o en la tarde si es otro día).
  useEffect(() => {
    const focus = nowMinutes ?? 16 * 60;
    const y = Math.max(0, yFor(focus) - HOUR_H * 1.5);
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const stripStart = useMemo(() => {
    const anchor = addDaysISO(today, -1);
    const end = addDaysISO(anchor, STRIP_DAYS - 1);
    return date < anchor || date > end ? addDaysISO(date, -3) : anchor;
  }, [date, today]);
  const days = useMemo(() => getDaysFrom(stripStart, STRIP_DAYS), [stripStart]);

  const byCourt = useMemo(() => {
    const map: Record<CourtId, Reservation[]> = { '1': [], '2': [] };
    reservations.forEach((r) => map[r.courtId]?.push(r));
    return map;
  }, [reservations]);

  const withDeposit = reservations.filter((r) => (r.deposit?.amount ?? 0) > 0).length;
  const bookedMinutes = reservations.reduce((acc, r) => acc + r.durationMinutes, 0);
  const freeHours = Math.max(0, ((CLOSING_MINUTES - OPENING_MINUTES) * 2 - bookedMinutes) / 60);
  // Reservas antiguas pueden terminar después de medianoche: la línea de tiempo se alarga para mostrarlas.
  const dayEnd = Math.max(CLOSING_MINUTES, ...reservations.map((r) => reservationRange(r)[1]));
  const hours = useMemo(() => hoursUntil(dayEnd), [dayEnd]);

  const openNew = (courtId?: CourtId, time?: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: '/reserva/nueva', params: { date, ...(courtId ? { courtId } : {}), ...(time ? { time } : {}) } });
  };

  const onColumnPress = (courtId: CourtId) => (e: GestureResponderEvent) => {
    const minutes = OPENING_MINUTES + Math.floor((e.nativeEvent.locationY / HOUR_H) * 2) * 30;
    if (minutes >= CLOSING_MINUTES) return;
    openNew(courtId, minutesToTime(minutes));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Agenda</Text>
          <Text style={styles.subtitle}>{formatDateLong(date)}</Text>
        </View>
        {date !== today && (
          <Pressable accessibilityRole="button" onPress={() => setDate(today)} style={styles.todayBtn}>
            <Text style={styles.todayText}>Hoy</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elegir fecha en el calendario"
          onPress={() => pickDate(date, setDate)}
          style={styles.iconBtn}
        >
          <Ionicons name="calendar-outline" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stripScroll}
        contentContainerStyle={styles.strip}
      >
        {days.map((d) => {
          const selected = d === date;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={formatDateLong(d)}
              onPress={() => setDate(d)}
              style={[styles.dayChip, selected ? styles.dayChipSelected : styles.dayChipIdle]}
            >
              <Text style={[styles.dayDow, { color: selected ? Colors.onPrimary : Colors.textMuted }]}>
                {dayOfWeekShort(d)}
              </Text>
              <Text style={[styles.dayNum, { color: selected ? Colors.onPrimary : Colors.textSecondary }]}>
                {dayOfMonth(d)}
              </Text>
              {d === today && !selected && <View style={styles.todayDot} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.summary}>
        <Text style={styles.summaryStrong}>
          {reservations.length} {reservations.length === 1 ? 'reserva' : 'reservas'}
        </Text>
        <Text style={styles.summaryText}>·</Text>
        <Text style={styles.summaryText}>{withDeposit} con adelanto</Text>
        <View style={styles.summaryRight}>
          <View style={[styles.legendDot, { backgroundColor: Colors.deposit }]} />
          <Text style={styles.summaryText}>{freeHours % 1 === 0 ? freeHours : freeHours.toFixed(1)} h libres</Text>
        </View>
      </View>

      <View style={styles.courtHeader}>
        <View style={{ width: TIME_COL }} />
        {COURTS.map((c) => (
          <View key={c} style={[styles.courtHead, { backgroundColor: CourtColors[c].fill }]}>
            <View style={[styles.legendDot, { backgroundColor: CourtColors[c].solid }]} />
            <Text style={[styles.courtHeadText, { color: CourtColors[c].text }]}>Cancha {c}</Text>
          </View>
        ))}
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ height: yFor(dayEnd) + 16, marginTop: 10 }}>
          {hours.map((m) => (
            <View key={m} style={[styles.hourRow, { top: yFor(m) }]} pointerEvents="none">
              <Text style={styles.hourLabel}>{formatTimeForChip(minutesToTime(m)).replace(':00', '')}</Text>
              <View style={styles.hourLine} />
            </View>
          ))}

          <View style={styles.columns}>
            {COURTS.map((c) => (
              <Pressable
                key={c}
                accessibilityLabel={`Reservar en cancha ${c}`}
                onPress={onColumnPress(c)}
                style={styles.column}
              >
                {byCourt[c].map((r) => (
                  <ReservationBlock key={r.id} r={r} onPress={() => router.push(`/reserva/${r.id}`)} />
                ))}
              </Pressable>
            ))}
          </View>

          {nowMinutes != null && nowMinutes >= OPENING_MINUTES && (
            <View pointerEvents="none" style={[styles.nowRow, { top: yFor(nowMinutes) - 9 }]}>
              <View style={styles.nowPill}>
                <Text style={styles.nowText}>{formatTimeForChip(minutesToTime(nowMinutes)).replace(/ (AM|PM)/, '')}</Text>
              </View>
              <View style={styles.nowDot} />
              <View style={styles.nowLine} />
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nueva reserva"
        onPress={() => openNew()}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="add" size={24} color={Colors.onPrimary} />
        <Text style={styles.fabText}>Reservar</Text>
      </Pressable>
    </View>
  );
}

function ReservationBlock({ r, onPress }: { r: Reservation; onPress: () => void }) {
  const [start, end] = reservationRange(r);
  const c = CourtColors[r.courtId];
  const height = yFor(end) - yFor(start) - 4;
  const compact = height < 56;
  const hasDeposit = (r.deposit?.amount ?? 0) > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${r.clientName}, ${formatTimeRange(r.startTime, r.durationMinutes)}`}
      onPress={onPress}
      style={[styles.block, { top: yFor(start) + 2, height, backgroundColor: c.fill, borderColor: c.border }]}
    >
      <View style={styles.blockTop}>
        <Text style={styles.blockName} numberOfLines={1}>
          {r.clientName}
        </Text>
        {hasDeposit && (
          <View style={styles.depositTag}>
            <Text style={styles.depositTagText}>S/</Text>
          </View>
        )}
      </View>
      {!compact || height >= 40 ? (
        <Text style={[styles.blockTime, { color: c.sub }]} numberOfLines={1}>
          {formatTimeRange(r.startTime, r.durationMinutes)}
        </Text>
      ) : null}
      {height >= 92 && !hasDeposit ? <Text style={styles.blockNote}>Sin adelanto</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  title: { fontFamily: Fonts.display, fontSize: 24, color: Colors.text, lineHeight: 26 },
  subtitle: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted },
  todayBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
  },
  todayText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.text },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Sin flexGrow: 0 la franja horizontal se estira y empuja la agenda hacia abajo.
  stripScroll: { flexGrow: 0, flexShrink: 0 },
  strip: { gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  dayChip: { width: 48, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayChipSelected: { backgroundColor: Colors.primary },
  dayChipIdle: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderSoft },
  dayDow: { fontFamily: Fonts.semibold, fontSize: 12 },
  dayNum: { fontFamily: Fonts.display, fontSize: 20 },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 2 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  summaryStrong: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.text },
  summaryText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted },
  summaryRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  courtHeader: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  courtHead: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  courtHeadText: { fontFamily: Fonts.display, fontSize: 15 },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start' },
  hourLabel: {
    width: TIME_COL,
    paddingRight: 8,
    textAlign: 'right',
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
    transform: [{ translateY: -8 }],
  },
  hourLine: { flex: 1, height: 1, backgroundColor: Colors.borderSoft },
  columns: { position: 'absolute', top: 0, bottom: 0, left: TIME_COL + 6, right: 12, flexDirection: 'row', gap: 6 },
  column: { flex: 1, height: '100%' },
  block: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  blockTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  blockName: { flex: 1, fontFamily: Fonts.bold, fontSize: 14, color: Colors.text },
  blockTime: { fontFamily: Fonts.medium, fontSize: 12 },
  blockNote: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  depositTag: { height: 18, paddingHorizontal: 5, borderRadius: 5, backgroundColor: Colors.deposit, justifyContent: 'center' },
  depositTagText: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.onDeposit },
  nowRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  nowPill: {
    width: TIME_COL - 4,
    marginLeft: 2,
    height: 18,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowText: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.onDanger },
  nowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger, marginLeft: 2 },
  nowLine: { flex: 1, height: 2, backgroundColor: Colors.danger },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    height: 56,
    paddingLeft: 18,
    paddingRight: 22,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
  },
  fabText: { fontFamily: Fonts.display, fontSize: 18, color: Colors.onPrimary },
});
