import { START_HOURS, type Reservation } from '@/types/reservation';

type SlotReservation = { startTime: string; durationMinutes: number; clientName: string };

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (h === 24) return 24 * 60;
  return h * 60 + m;
}

export function isSlotOccupied(
  slotStart: string,
  durationMinutes: number,
  reservations: SlotReservation[]
): { occupied: boolean; clientName?: string } {
  const slotEnd = addMinutesToTime(slotStart, durationMinutes);
  const slotStartMin = timeToMinutes(slotStart);
  const slotEndMin = timeToMinutes(slotEnd);

  for (const r of reservations) {
    const rEnd = addMinutesToTime(r.startTime, r.durationMinutes);
    const rStartMin = timeToMinutes(r.startTime);
    const rEndMin = timeToMinutes(rEnd);
    if (slotStartMin < rEndMin && slotEndMin > rStartMin) {
      return { occupied: true, clientName: r.clientName };
    }
  }
  return { occupied: false };
}

/** Formato 12h para chips y etiquetas (24:00 = medianoche = 12:00 AM) */
export function formatTimeForChip(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (h === 0 || h === 24) return `12:${String(m).padStart(2, '0')} AM`;
  if (h === 12) return `12:${String(m).padStart(2, '0')} PM`;
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`;
  return `${h - 12}:${String(m).padStart(2, '0')} PM`;
}

export function formatTimeRange(start: string, durationMinutes: number): string {
  const end = addMinutesToTime(start, durationMinutes);
  return `${formatTimeForChip(start)} - ${formatTimeForChip(end)}`;
}

export function getStartHoursForPicker(): string[] {
  return [...START_HOURS];
}

/** Formatea YYYY-MM-DD en fecha local (sin usar UTC) */
function parseLocalDate(dateStr: string): Date {
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function formatDateForDisplay(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatDateShort(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/** Fecha de hoy en zona local como YYYY-MM-DD (evita desfase por UTC) */
export function getTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Próximos días en zona local; ancla en getTodayISO() para evitar desfase UTC */
export function getNextDays(count: number): { label: string; date: string }[] {
  const out: { label: string; date: string }[] = [];
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = getTodayISO();
  const [ty, tm, td] = today.split('-').map(Number);
  for (let i = 0; i < count; i++) {
    const d = new Date(ty, tm - 1, td + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    out.push({ label: `${days[d.getDay()]} ${d.getDate()}`, date: dateStr });
  }
  return out;
}

/** Rango de fechas para filtros (pasado + futuro); ancla en getTodayISO() para evitar desfase UTC */
export function getDateRange(pastDays: number, futureDays: number): { label: string; date: string }[] {
  const out: { label: string; date: string }[] = [];
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = getTodayISO();
  const [ty, tm, td] = today.split('-').map(Number);
  for (let i = -pastDays; i <= futureDays; i++) {
    const d = new Date(ty, tm - 1, td + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    out.push({ label: `${days[d.getDay()]} ${d.getDate()}`, date: dateStr });
  }
  return out;
}

/** Convierte DD/MM/AAAA a YYYY-MM-DD; retorna null si la fecha es inválida */
export function parseDDMMYYYY(input: string): string | null {
  const parts = input.split('/');
  if (parts.length !== 3 || parts[2].length < 4) return null;
  const [d, m, y] = parts.map(Number);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function sortReservationsDesc(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.startTime.localeCompare(a.startTime);
  });
}
