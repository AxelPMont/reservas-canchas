import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
  type DocumentReference,
  type Transaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { CourtId, HistoryEntry, Reservation, ReservationForm } from '@/types/reservation';
import { getCached, setCached } from './reservations-cache';
import {
  formatTimeRange,
  isReservationFinished,
  rangesOverlap,
  reservationEndDate,
  reservationRange,
  sortReservationsAsc,
} from './time-utils';

const RESERVATIONS = 'reservations';
/** Un documento por cancha y día con los rangos ocupados. Sirve de "candado" en las transacciones. */
const SCHEDULES = 'schedules';
const CLIENTS = 'clients';

export type Actor = { uid: string; name: string };

/** Otra reserva ocupa el horario. */
export class ReservationConflictError extends Error {
  constructor(public clientName: string) {
    super(`Ese horario ya está ocupado por ${clientName}.`);
    this.name = 'ReservationConflictError';
  }
}

/** La reserva ya terminó y no se puede modificar. */
export class ReservationLockedError extends Error {
  constructor() {
    super('Esta reserva ya terminó y no se puede modificar.');
    this.name = 'ReservationLockedError';
  }
}

type ScheduleBooking ={ start: number; end: number; clientName: string };
type ScheduleDoc = { date: string; courtId: CourtId; bookings: Record<string, ScheduleBooking> };

function scheduleRef(date: string, courtId: CourtId) {
  return doc(db, SCHEDULES, `${date}_${courtId}`);
}

export function normalizeClientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

function clientRef(name: string) {
  return doc(db, CLIENTS, normalizeClientName(name).replace(/\//g, '-'));
}

export function mapDocToReservation(id: string, data: Record<string, unknown>): Reservation {
  const createdAt = data.createdAt as Timestamp | undefined;
  return {
    id,
    date: data.date as string,
    courtId: data.courtId as CourtId,
    startTime: data.startTime as string,
    durationMinutes: data.durationMinutes as number,
    clientName: data.clientName as string,
    userId: data.userId as string,
    phone: (data.phone as string | undefined) || undefined,
    deposit: (data.deposit as Reservation['deposit']) ?? null,
    createdByName: data.createdByName as string | undefined,
    createdAt: createdAt?.toDate?.()?.toISOString?.() ?? undefined,
    history: (data.history as HistoryEntry[] | undefined) ?? [],
  };
}

/**
 * Lee la agenda de la cancha/día dentro de la transacción. Si aún no existe (días creados
 * con la versión anterior de la app), la arma a partir de las reservas existentes.
 */
async function readSchedule(
  tx: Transaction,
  date: string,
  courtId: CourtId
): Promise<{ ref: DocumentReference; bookings: Record<string, ScheduleBooking>; exists: boolean }> {
  const ref = scheduleRef(date, courtId);
  const snap = await tx.get(ref);
  if (snap.exists()) {
    return { ref, bookings: { ...(snap.data() as ScheduleDoc).bookings }, exists: true };
  }
  const legacy = await getDocs(
    query(collection(db, RESERVATIONS), where('date', '==', date), where('courtId', '==', courtId))
  );
  const bookings: Record<string, ScheduleBooking> = {};
  legacy.docs.forEach((d) => {
    const r = mapDocToReservation(d.id, d.data());
    const [start, end] = reservationRange(r);
    bookings[d.id] = { start, end, clientName: r.clientName };
  });
  return { ref, bookings, exists: false };
}

function assertFree(
  bookings: Record<string, ScheduleBooking>,
  range: [number, number],
  ignoreId?: string
) {
  for (const [id, b] of Object.entries(bookings)) {
    if (id !== ignoreId && rangesOverlap(range, [b.start, b.end])) {
      throw new ReservationConflictError(b.clientName);
    }
  }
}

function buildDeposit(amount: number | null | undefined, actor: Actor) {
  if (amount == null || !(amount > 0)) return null;
  return { amount: Math.round(amount * 100) / 100, registeredByName: actor.name, registeredAt: new Date().toISOString() };
}

function historyEntry(action: HistoryEntry['action'], actor: Actor, detail?: string): HistoryEntry {
  return detail
    ? { action, byName: actor.name, at: new Date().toISOString(), detail }
    : { action, byName: actor.name, at: new Date().toISOString() };
}

/** Crea una reserva verificando, de forma atómica, que el horario siga libre. */
export async function createReservation(
  actor: Actor,
  data: ReservationForm
): Promise<string> {
  const newRef = doc(collection(db, RESERVATIONS));
  const range = reservationRange(data);
  const clientName = data.clientName.trim();
  const phone = data.phone?.trim() || null;

  await runTransaction(db, async (tx) => {
    const schedule = await readSchedule(tx, data.date, data.courtId);
    const client = await tx.get(clientRef(clientName));
    assertFree(schedule.bookings, range);

    tx.set(newRef, {
      date: data.date,
      courtId: data.courtId,
      startTime: data.startTime,
      durationMinutes: data.durationMinutes,
      clientName,
      phone,
      deposit: buildDeposit(data.depositAmount, actor),
      endsAt: Timestamp.fromDate(reservationEndDate(data)),
      userId: actor.uid,
      createdByName: actor.name,
      createdAt: Timestamp.now(),
      history: [historyEntry('created', actor)],
    });

    const bookings = { ...schedule.bookings, [newRef.id]: { start: range[0], end: range[1], clientName } };
    tx.set(schedule.ref, { date: data.date, courtId: data.courtId, bookings });

    tx.set(
      client.ref,
      {
        name: clientName,
        nameLower: normalizeClientName(clientName),
        ...(phone ? { phone } : {}),
        reservationsCount: increment(1),
        lastReservationAt: Timestamp.now(),
      },
      { merge: true }
    );
  });
  return newRef.id;
}

/** Edita una reserva. Si cambia fecha, cancha u horario, vuelve a verificar que esté libre. */
export async function updateReservation(
  actor: Actor,
  before: Reservation,
  data: ReservationForm
): Promise<void> {
  const ref = doc(db, RESERVATIONS, before.id);
  const range = reservationRange(data);
  const clientName = data.clientName.trim();
  const sameSlot = before.date === data.date && before.courtId === data.courtId;

  const changes: string[] = [];
  if (before.date !== data.date || before.courtId !== data.courtId) {
    changes.push(`movió a cancha ${data.courtId}, ${data.date}`);
  }
  if (before.startTime !== data.startTime || before.durationMinutes !== data.durationMinutes) {
    changes.push(
      `cambió el horario de ${formatTimeRange(before.startTime, before.durationMinutes)} a ${formatTimeRange(data.startTime, data.durationMinutes)}`
    );
  }
  if (before.clientName !== clientName) changes.push(`cambió el cliente a ${clientName}`);
  if ((before.phone ?? '') !== (data.phone?.trim() ?? '')) changes.push('actualizó el teléfono');

  const prevAmount = before.deposit?.amount ?? null;
  const nextAmount = data.depositAmount != null && data.depositAmount > 0 ? data.depositAmount : null;
  const depositChanged = prevAmount !== nextAmount;

  await runTransaction(db, async (tx) => {
    // Se revisa la versión guardada, no la que tenía la pantalla al abrirse.
    const current = await tx.get(ref);
    if (!current.exists()) throw new Error('La reserva ya no existe.');
    if (isReservationFinished(mapDocToReservation(current.id, current.data()))) {
      throw new ReservationLockedError();
    }
    const newSchedule = await readSchedule(tx, data.date, data.courtId);
    const oldSchedule = sameSlot ? newSchedule : await readSchedule(tx, before.date, before.courtId);
    assertFree(newSchedule.bookings, range, before.id);

    const entries: HistoryEntry[] = [];
    if (changes.length > 0) entries.push(historyEntry('updated', actor, changes.join(' · ')));
    if (depositChanged) {
      entries.push(
        historyEntry('deposit', actor, nextAmount != null ? `registró adelanto de S/ ${nextAmount.toFixed(2)}` : 'quitó el adelanto')
      );
    }

    tx.update(ref, {
      date: data.date,
      courtId: data.courtId,
      startTime: data.startTime,
      durationMinutes: data.durationMinutes,
      clientName,
      phone: data.phone?.trim() || null,
      endsAt: Timestamp.fromDate(reservationEndDate(data)),
      ...(depositChanged ? { deposit: buildDeposit(nextAmount, actor) } : {}),
      ...(entries.length > 0 ? { history: arrayUnion(...entries) } : {}),
    });

    if (!sameSlot) {
      const oldBookings = { ...oldSchedule.bookings };
      delete oldBookings[before.id];
      tx.set(oldSchedule.ref, { date: before.date, courtId: before.courtId, bookings: oldBookings });
    }
    const bookings = { ...newSchedule.bookings, [before.id]: { start: range[0], end: range[1], clientName } };
    tx.set(newSchedule.ref, { date: data.date, courtId: data.courtId, bookings });
  });
}

/** Elimina la reserva y libera su horario (solo administradores, lo exigen las reglas). */
export async function deleteReservation(r: Reservation): Promise<void> {
  await runTransaction(db, async (tx) => {
    const sRef = scheduleRef(r.date, r.courtId);
    const snap = await tx.get(sRef);
    tx.delete(doc(db, RESERVATIONS, r.id));
    if (snap.exists()) tx.update(sRef, { [`bookings.${r.id}`]: deleteField() });
  });
}

function listen(
  q: ReturnType<typeof query>,
  cacheKey: string,
  onUpdate: (list: Reservation[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  let live = false;
  getCached(cacheKey).then((cached) => {
    if (cached && !live) onUpdate(cached);
  });
  return onSnapshot(
    q,
    (snap) => {
      live = true;
      const list = sortReservationsAsc(
        snap.docs.map((d) => mapDocToReservation(d.id, d.data() as Record<string, unknown>))
      );
      setCached(cacheKey, list);
      onUpdate(list);
    },
    (e) => onError?.(e)
  );
}

/** Reservas de un día (ambas canchas), en tiempo real. */
export function subscribeDay(
  date: string,
  onUpdate: (list: Reservation[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return listen(query(collection(db, RESERVATIONS), where('date', '==', date)), `day_${date}`, onUpdate, onError);
}

/** Reservas desde una fecha en adelante (para la lista), en tiempo real. */
export function subscribeFrom(
  fromDate: string,
  onUpdate: (list: Reservation[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return listen(
    query(collection(db, RESERVATIONS), where('date', '>=', fromDate), orderBy('date', 'asc')),
    'from',
    onUpdate,
    onError
  );
}

/** Una reserva, en tiempo real. */
export function subscribeReservation(
  id: string,
  onUpdate: (r: Reservation | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, RESERVATIONS, id),
    (snap) => onUpdate(snap.exists() ? mapDocToReservation(snap.id, snap.data()) : null),
    (e) => onError?.(e)
  );
}

/** Reservas anteriores a una fecha (bajo demanda, de a páginas). */
export async function getReservationsBefore(beforeDate: string, pageSize = 50): Promise<Reservation[]> {
  const snap = await getDocs(
    query(
      collection(db, RESERVATIONS),
      where('date', '<', beforeDate),
      orderBy('date', 'desc'),
      limit(pageSize)
    )
  );
  return snap.docs.map((d) => mapDocToReservation(d.id, d.data() as Record<string, unknown>));
}

export type ClientSuggestion = { name: string; phone?: string; reservationsCount: number };

/** Clientes cuyo nombre empieza con el texto escrito (para autocompletar). */
export async function searchClients(text: string, max = 5): Promise<ClientSuggestion[]> {
  const prefix = normalizeClientName(text);
  if (prefix.length < 2) return [];
  const snap = await getDocs(
    query(
      collection(db, CLIENTS),
      orderBy('nameLower'),
      where('nameLower', '>=', prefix),
      where('nameLower', '<=', prefix + ''),
      limit(max)
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      name: data.name as string,
      phone: (data.phone as string | null) ?? undefined,
      reservationsCount: (data.reservationsCount as number) ?? 0,
    };
  });
}
