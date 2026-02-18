export type CourtId = '1' | '2';

export const DURATION_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: '1.5 horas', minutes: 90 },
  { label: '2 horas', minutes: 120 },
  { label: '2.5 horas', minutes: 150 },
  { label: '3 horas', minutes: 180 },
  { label: '3.5 horas', minutes: 210 },
  { label: '4 horas', minutes: 240 },
] as const;

export interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD
  courtId: CourtId;
  startTime: string; // "07:00", "08:00", ...
  durationMinutes: number;
  clientName: string;
  userId: string;
  createdAt?: string;
}

export interface ReservationForm {
  date: string;
  courtId: CourtId;
  startTime: string;
  durationMinutes: number;
  clientName: string;
}

// Horas de 7:00 AM a 12:00 AM (medianoche) en intervalos de 30 min
export const START_HOURS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '24:00',
] as const;
