import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Reservation, ReservationForm, CourtId } from '@/types/reservation';

const COLLECTION = 'reservations';

export function reservationsRef() {
  return collection(db, COLLECTION);
}

export async function createReservation(
  userId: string,
  data: ReservationForm
): Promise<string> {
  const ref = await addDoc(reservationsRef(), {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function deleteReservation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export function reservationsByUserQuery(userId: string) {
  return query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'asc')
  );
}

export function reservationsByDateAndCourtQuery(date: string, courtId: CourtId) {
  return query(
    collection(db, COLLECTION),
    where('date', '==', date),
    where('courtId', '==', courtId)
  );
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
    createdAt: createdAt?.toDate?.()?.toISOString?.() ?? undefined,
  };
}

export async function getReservationsByUser(userId: string): Promise<Reservation[]> {
  const snap = await getDocs(reservationsByUserQuery(userId));
  const list = snap.docs.map((d) => mapDocToReservation(d.id, d.data() as Record<string, unknown>));
  list.sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
  return list;
}

export async function getReservationsByDateAndCourt(
  date: string,
  courtId: CourtId
): Promise<Reservation[]> {
  const snap = await getDocs(reservationsByDateAndCourtQuery(date, courtId));
  return snap.docs.map((d) => mapDocToReservation(d.id, d.data() as Record<string, unknown>));
}

export function subscribeReservationsByUser(
  userId: string,
  onUpdate: (reservations: Reservation[]) => void
): Unsubscribe {
  return onSnapshot(reservationsByUserQuery(userId), (snap) => {
    const list = snap.docs.map((d) =>
      mapDocToReservation(d.id, d.data() as Record<string, unknown>)
    );
    list.sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
    onUpdate(list);
  });
}

export function subscribeReservationsByDateAndCourt(
  date: string,
  courtId: CourtId,
  onUpdate: (reservations: Reservation[]) => void
): Unsubscribe {
  return onSnapshot(reservationsByDateAndCourtQuery(date, courtId), (snap) => {
    const list = snap.docs.map((d) =>
      mapDocToReservation(d.id, d.data() as Record<string, unknown>)
    );
    onUpdate(list);
  });
}
