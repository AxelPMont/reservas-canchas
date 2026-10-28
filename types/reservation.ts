export type CourtId = '1' | '2';

export const COURTS: CourtId[] = ['1', '2'];

export type UserRole = 'admin' | 'empleado';

export const MIN_DURATION = 30;
export const MAX_DURATION = 240;
export const DURATION_STEP = 30;

/** Adelanto opcional que dejó el cliente. */
export interface Deposit {
  amount: number;
  registeredByName: string;
  registeredAt: string; // ISO
}

/** Entrada del historial de cambios de una reserva. */
export interface HistoryEntry {
  action: 'created' | 'updated' | 'deposit';
  byName: string;
  at: string; // ISO
  detail?: string;
}

export interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD
  courtId: CourtId;
  startTime: string; // "07:00" … "23:30" (reservas antiguas pueden tener "24:00")
  durationMinutes: number;
  clientName: string;
  userId: string;
  phone?: string;
  deposit?: Deposit | null;
  createdByName?: string;
  createdAt?: string;
  history?: HistoryEntry[];
}

export interface ReservationForm {
  date: string;
  courtId: CourtId;
  startTime: string;
  durationMinutes: number;
  clientName: string;
  phone?: string;
  /** Monto del adelanto; null o undefined = sin adelanto. */
  depositAmount?: number | null;
}

/** Horario de atención: de 7:00 AM a 12:00 AM (medianoche). */
export const OPENING_MINUTES = 7 * 60;
export const CLOSING_MINUTES = 24 * 60;

// Horas de inicio de 7:00 AM a 11:30 PM en intervalos de 30 min
export const START_HOURS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
] as const;
