import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourtManagerColors } from '@/constants/theme';
import {
  subscribeAllReservationsWithCache,
  deleteReservation,
} from '@/lib/reservations';
import {
  formatDateForDisplay,
  formatTimeRange,
  getTodayISO,
  getDateRange,
  sortReservationsDesc,
} from '@/lib/time-utils';
import type { Reservation } from '@/types/reservation';

type FilterTab = 'all' | 'today';

export default function MisReservasScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dateOptions = useMemo(() => getDateRange(60, 60), []);

  useEffect(() => {
    const unsub = subscribeAllReservationsWithCache(setReservations);
    return () => unsub();
  }, []);

  const today = getTodayISO();

  const filtered = useMemo(() => {
    let list = [...reservations];

    if (filter === 'today') {
      list = list.filter((r) => r.date === today);
    } else if (filterDate) {
      list = list.filter((r) => r.date === filterDate);
    }

    return sortReservationsDesc(list);
  }, [reservations, filter, filterDate, today]);

  const countToday = reservations.filter((r) => r.date === today).length;

  const onDelete = (r: Reservation) => {
    Alert.alert(
      'Cancelar reserva',
      `¿Eliminar la reserva del ${formatDateForDisplay(r.date)} a las ${r.startTime}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: () => deleteReservation(r.id),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Reservation }) => {
    const isToday = item.date === today;
    const accentColor = isToday ? CourtManagerColors.todayBadge : CourtManagerColors.futureAccent;
    return (
      <View style={styles.card}>
        <View style={[styles.cardBar, { backgroundColor: accentColor }]} />
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{item.clientName}</Text>
          {isToday && (
            <View style={styles.badgeToday}>
              <Text style={styles.badgeTodayText}>HOY</Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={14} color={CourtManagerColors.textMuted} />
            <Text style={styles.cardDetail}>{formatDateForDisplay(item.date)}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={14} color={accentColor} />
            <Text style={[styles.cardDetail, { color: accentColor }]}>Cancha {item.courtId}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="time-outline" size={14} color={CourtManagerColors.textMuted} />
            <Text style={styles.cardDetail}>
              {formatTimeRange(item.startTime, item.durationMinutes)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="trash-outline" size={24} color={CourtManagerColors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => {
            setFilter('all');
            setShowDatePicker(false);
          }}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            Todas ({reservations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'today' && styles.tabActive]}
          onPress={() => {
            setFilter('today');
            setFilterDate(null);
            setShowDatePicker(false);
          }}
        >
          <Text style={[styles.tabText, filter === 'today' && styles.tabTextActive]}>
            Hoy ({countToday})
          </Text>
        </TouchableOpacity>
      </View>

      {filter === 'all' && (
        <View style={styles.dateFilterSection}>
          <TouchableOpacity
            style={styles.dateFilterButton}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Ionicons name="calendar-outline" size={18} color={CourtManagerColors.primary} />
            <Text style={styles.dateFilterButtonText}>
              {filterDate ? formatDateForDisplay(filterDate) : 'Filtrar por fecha'}
            </Text>
            <Ionicons
              name={showDatePicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={CourtManagerColors.textMuted}
            />
          </TouchableOpacity>
          {filterDate ? (
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => {
                setFilterDate(null);
                setShowDatePicker(false);
              }}
            >
              <Text style={styles.clearFilterText}>Ver todas</Text>
            </TouchableOpacity>
          ) : null}
          {showDatePicker && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateStrip}
              contentContainerStyle={styles.dateStripContent}
            >
              {dateOptions.map((d) => (
                <TouchableOpacity
                  key={d.date}
                  style={[styles.dateChip, filterDate === d.date && styles.dateChipSelected]}
                  onPress={() => {
                    setFilterDate(d.date);
                    setShowDatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      filterDate === d.date && styles.dateChipTextSelected,
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {filter === 'today'
                ? 'No hay reservas para hoy'
                : filterDate
                  ? `No hay reservas para ${formatDateForDisplay(filterDate)}`
                  : 'No hay reservas'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(false)}
            tintColor={CourtManagerColors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CourtManagerColors.background },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 12, marginBottom: 8 },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: CourtManagerColors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: CourtManagerColors.textMuted },
  tabTextActive: { color: CourtManagerColors.primary },
  dateFilterSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CourtManagerColors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dateFilterButtonText: {
    flex: 1,
    color: CourtManagerColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  clearFilterBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  clearFilterText: { color: CourtManagerColors.primary, fontSize: 14, fontWeight: '600' },
  dateStrip: { maxHeight: 52 },
  dateStripContent: { gap: 8, paddingVertical: 4 },
  dateChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: CourtManagerColors.card,
  },
  dateChipSelected: { backgroundColor: CourtManagerColors.primary },
  dateChipText: { color: CourtManagerColors.text, fontWeight: '600', fontSize: 13 },
  dateChipTextSelected: { color: '#fff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: CourtManagerColors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardBar: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardName: { fontSize: 16, fontWeight: '600', color: CourtManagerColors.text, marginBottom: 6 },
  badgeToday: {
    alignSelf: 'flex-start',
    backgroundColor: CourtManagerColors.todayBadge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeTodayText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardDetail: { fontSize: 13, color: CourtManagerColors.textMuted },
  deleteBtn: { padding: 14, justifyContent: 'center' },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: CourtManagerColors.textMuted, fontSize: 15 },
});
