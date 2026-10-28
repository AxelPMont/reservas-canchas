import { CLOSING_MINUTES, type Reservation } from '@/types/reservation';

type SlotReservation = { startTime: string; durationMinutes: number; clientName: string };

/** "HH:MM" → minutos desde las 00:00. "24:00" (reservas antiguas) = medianoche al final del día. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Minutos → "HH:MM" sin volver a 00 a medianoche (1440 → "24:00"). */
export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

/** Rango [inicio, fin) en minutos de una reserva. */
export function reservationRange(r: { startTime: string; durationMinutes: number }): [number, number] {
  const start = timeToMinutes(r.startTime);
  return [start, start + r.durationMinutes];
}

export function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && a[1] > b[0];
}

export function isSlotOccupied(
  slotStart: string,
  durationMinutes: number,
  reservations: SlotReservation[]
): { occupied: boolean; clientName?: string } {
  const slot = reservationRange({ startTime: slotStart, durationMinutes });
  for (const r of reservations) {
    if (rangesOverlap(slot, reservationRange(r))) {
      return { occupied: true, clientName: r.clientName };
    }
  }
  return { occupied: false };
}

/** La reserva termina a más tardar a la hora de cierre (12:00 AM). */
export function fitsBeforeClosing(slotStart: string, durationMinutes: number): boolean {
  return timeToMinutes(slotStart) + durationMinutes <= CLOSING_MINUTES;
}

/** true si el inicio del turno ya pasó. */
/** Fecha y hora en que termina la reserva. */
export function reservationEndDate(r: { date: string; startTime: string; durationMinutes: number }): Date {
  const end = parseLocalDate(r.date);
  end.setMinutes(reservationRange(r)[1]);
  return end;
}

/** La reserva ya terminó: no se puede editar. */
export function isReservationFinished(
  r: { date: string; startTime: string; durationMinutes: number },
  now: Date = new Date()
): boolean {
  return reservationEndDate(r).getTime() <= now.getTime();
}

export function isSlotInPast(dateStr: string, slotStart: string, now: Date = new Date()): boolean {
  const start = parseLocalDate(dateStr);
  start.setMinutes(timeToMinutes(slotStart));
  return start.getTime() <= now.getTime();
}

/** Formato 12h para chips y etiquetas (24:00 = medianoche = 12:00 AM) */
export function formatTimeForChip(time: string): string {
  const [rawH, m] = time.split(':').map(Number);
  const h = rawH % 24;
  const mm = String(m).padStart(2, '0');
  if (h === 0) return `12:${mm} AM`;
  if (h === 12) return `12:${mm} PM`;
  if (h < 12) return `${h}:${mm} AM`;
  return `${h - 12}:${mm} PM`;
}

/** Duración legible: 90 → "1 h 30 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatTimeRange(start: string, durationMinutes: number): string {
  const end = addMinutesToTime(start, durationMinutes);
  return `${formatTimeForChip(start)} - ${formatTimeForChip(end)}`;
}

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** YYYY-MM-DD → Date local (sin usar UTC) */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Date → YYYY-MM-DD en zona local */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "mié, 21 oct" */
export function formatDateForDisplay(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${DAYS_SHORT[d.getDay()].toLowerCase()}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Miércoles 21 de octubre" */
export function formatDateLong(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;
}

export function dayOfWeekShort(dateStr: string): string {
  return DAYS_SHORT[parseLocalDate(dateStr).getDay()];
}

export function dayOfMonth(dateStr: string): number {
  return parseLocalDate(dateStr).getDate();
}

/** Fecha de hoy en zona local como YYYY-MM-DD (evita desfase por UTC) */
export function getTodayISO(): string {
  return toISODate(new Date());
}

/** Días consecutivos desde una fecha. */
export function getDaysFrom(startDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDaysISO(startDate, i));
}

/** Minutos de "ahora" dentro de ese día (para la línea de hora actual); null si es otro día. */
export function minutesNowInDay(dateStr: string, now: Date = new Date()): number | null {
  const start = parseLocalDate(dateStr).getTime();
  const diff = Math.floor((now.getTime() - start) / 60000);
  return diff >= 0 && diff < 24 * 60 ? diff : null;
}

export function sortReservationsAsc(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? timeToMinutes(a.startTime) - timeToMinutes(b.startTime) : a.date.localeCompare(b.date)
  );
}

export function sortReservationsDesc(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? timeToMinutes(b.startTime) - timeToMinutes(a.startTime) : b.date.localeCompare(a.date)
  );
}
