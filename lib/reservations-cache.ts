import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reservation } from '@/types/reservation';

/**
 * Caché local para mostrar datos al instante (y sin conexión) mientras llega la
 * actualización en tiempo real de Firestore.
 */
const PREFIX = 'courtmanager_v2_';
const LEGACY_PREFIX = 'courtmanager_reservations';
/** Cuántos días de agenda se guardan en caché. */
const MAX_DAY_KEYS = 21;

export async function getCached(key: string): Promise<Reservation[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Reservation[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setCached(key: string, list: Reservation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** Borra la caché de la versión anterior y los días más viejos. Se llama al iniciar la app. */
export async function pruneCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const legacy = keys.filter((k) => k.startsWith(LEGACY_PREFIX));
    const dayKeys = keys
      .filter((k) => k.startsWith(PREFIX + 'day_'))
      .sort()
      .reverse();
    const old = dayKeys.slice(MAX_DAY_KEYS);
    if (legacy.length + old.length > 0) await AsyncStorage.multiRemove([...legacy, ...old]);
  } catch {
    // ignore
  }
}
