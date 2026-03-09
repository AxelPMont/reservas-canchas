import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reservation } from '@/types/reservation';
import type { CourtId } from '@/types/reservation';

const PREFIX = 'courtmanager_reservations';
const KEY_ALL = `${PREFIX}_all`;

export function cacheKeyForDateCourt(date: string, courtId: CourtId): string {
  return `${PREFIX}_${date}_${courtId}`;
}

export async function getCachedAllReservations(): Promise<Reservation[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ALL);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Reservation[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setCachedAllReservations(list: Reservation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_ALL, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function getCachedOccupied(
  date: string,
  courtId: CourtId
): Promise<Reservation[] | null> {
  try {
    const key = cacheKeyForDateCourt(date, courtId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Reservation[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setCachedOccupied(
  date: string,
  courtId: CourtId,
  list: Reservation[]
): Promise<void> {
  try {
    const key = cacheKeyForDateCourt(date, courtId);
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore
  }
}
