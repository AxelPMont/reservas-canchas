import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, CourtBadge, DepositBadge, EmptyState, Field } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { friendlyError } from '@/lib/errors';
import { digitsOnly } from '@/lib/phone';
import { getReservationsBefore, normalizeClientName, subscribeFrom } from '@/lib/reservations';
import {
  addDaysISO,
  formatDateForDisplay,
  formatDuration,
  formatTimeForChip,
  getTodayISO,
  sortReservationsAsc,
  sortReservationsDesc,
} from '@/lib/time-utils';
import type { Reservation } from '@/types/reservation';

type Filter = 'upcoming' | 'today' | 'noDeposit' | 'past';

/** Días hacia atrás que se escuchan en tiempo real. Lo anterior se carga a pedido. */
const PAST_DAYS_LIVE = 7;

export default function ReservasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = getTodayISO();
  const liveFrom = addDaysISO(today, -PAST_DAYS_LIVE);

  const [live, setLive] = useState<Reservation[]>([]);
  const [older, setOlder] = useState<Reservation[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [noMoreOlder, setNoMoreOlder] = useState(false);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => subscribeFrom(liveFrom, setLive), [liveFrom]);

  const upcoming = useMemo(() => live.filter((r) => r.date >= today), [live, today]);
  const counts = {
    upcoming: upcoming.length,
    today: upcoming.filter((r) => r.date === today).length,
    noDeposit: upcoming.filter((r) => !(r.deposit?.amount ?? 0)).length,
  };

  const filtered = useMemo(() => {
    let list: Reservation[];
    if (filter === 'today') list = upcoming.filter((r) => r.date === today);
    else if (filter === 'noDeposit') list = upcoming.filter((r) => !(r.deposit?.amount ?? 0));
    else if (filter === 'past') list = [...live.filter((r) => r.date < today), ...older];
    else list = upcoming;

    const q = search.trim();
    if (q) {
      const name = normalizeClientName(q);
      const digits = digitsOnly(q);
      list = list.filter(
        (r) =>
          normalizeClientName(r.clientName).includes(name) ||
          (digits.length >= 3 && r.phone && digitsOnly(r.phone).includes(digits))
      );
    }
    return filter === 'past' ? sortReservationsDesc(list) : sortReservationsAsc(list);
  }, [filter, upcoming, live, older, today, search]);

  const sections = useMemo(() => {
    const groups = new Map<string, Reservation[]>();
    filtered.forEach((r) => {
      if (!groups.has(r.date)) groups.set(r.date, []);
      groups.get(r.date)!.push(r);
    });
    return [...groups.entries()].map(([date, data]) => ({ date, data }));
  }, [filtered]);

  const loadOlder = async () => {
    setLoadingOlder(true);
    try {
      const before = older.length > 0 ? older[older.length - 1].date : liveFrom;
      const page = await getReservationsBefore(before);
      // Evita duplicados si el último día quedó a medias entre páginas.
      const seen = new Set(older.map((r) => r.id));
      const fresh = page.filter((r) => !seen.has(r.id));
      setOlder((prev) => sortReservationsDesc([...prev, ...fresh]));
      if (page.length === 0) setNoMoreOlder(true);
    } catch (e) {
      Alert.alert('Error', friendlyError(e, 'No se pudieron cargar las reservas anteriores.'));
    } finally {
      setLoadingOlder(false);
    }
  };

  const dayTitle = (date: string) => {
    if (date === today) return 'Hoy';
    if (date === addDaysISO(today, 1)) return 'Mañana';
    if (date === addDaysISO(today, -1)) return 'Ayer';
    return formatDateForDisplay(date).replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Reservas</Text>
        <Field
          icon="search"
          placeholder="Buscar por cliente o teléfono"
          value={search}
          onChangeText={setSearch}
          focused={searchFocused}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
          right={
            search ? (
              <Pressable accessibilityLabel="Borrar búsqueda" onPress={() => setSearch('')} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </Pressable>
            ) : null
          }
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={`Próximas · ${counts.upcoming}`} selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
          <Chip label={`Hoy · ${counts.today}`} selected={filter === 'today'} onPress={() => setFilter('today')} />
          <Chip label={`Sin adelanto · ${counts.noDeposit}`} selected={filter === 'noDeposit'} onPress={() => setFilter('noDeposit')} />
          <Chip label="Pasadas" selected={filter === 'past'} onPress={() => setFilter('past')} />
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{dayTitle(section.date)}</Text>
            <Text style={styles.sectionSub}>{formatDateForDisplay(section.date)}</Text>
          </View>
        )}
        renderItem={({ item }) => <ReservationRow r={item} onPress={() => router.push(`/reserva/${item.id}`)} />}
        ListEmptyComponent={
          <EmptyState
            icon={search ? 'search' : 'calendar-clear-outline'}
            title={search ? 'Sin resultados' : filter === 'past' ? 'No hay reservas pasadas cargadas' : 'No hay reservas'}
            subtitle={search ? `Nada coincide con "${search}".` : undefined}
          />
        }
        ListFooterComponent={
          filter === 'past' && !noMoreOlder ? (
            <Button
              label="Cargar reservas anteriores"
              icon="time-outline"
              variant="outline"
              onPress={loadOlder}
              loading={loadingOlder}
              style={{ marginTop: 12 }}
            />
          ) : null
        }
      />
    </View>
  );
}

function ReservationRow({ r, onPress }: { r: Reservation; onPress: () => void }) {
  const [time, ampm] = formatTimeForChip(r.startTime).split(' ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfaceRaised }]}
    >
      <View style={styles.timeCol}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.ampm}>{ampm}</Text>
        <Text style={styles.duration}>{formatDuration(r.durationMinutes)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {r.clientName}
        </Text>
        <View style={styles.badges}>
          <CourtBadge courtId={r.courtId} />
          <DepositBadge amount={r.deposit?.amount} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.borderDashed} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  title: { fontFamily: Fonts.display, fontSize: 26, color: Colors.text },
  chips: { gap: 8, paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 14, paddingBottom: 8 },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text },
  sectionSub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  timeCol: {
    width: 64,
    alignItems: 'center',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  time: { fontFamily: Fonts.displayHeavy, fontSize: 20, color: Colors.text, lineHeight: 22 },
  ampm: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.textMuted },
  duration: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  rowBody: { flex: 1, gap: 6 },
  name: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
