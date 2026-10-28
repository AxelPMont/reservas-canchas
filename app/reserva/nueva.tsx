import { useLocalSearchParams } from 'expo-router';
import { ReservationFormScreen } from '@/components/reservation-form';
import { getTodayISO } from '@/lib/time-utils';
import type { CourtId } from '@/types/reservation';

export default function NuevaReservaScreen() {
  const params = useLocalSearchParams<{ date?: string; courtId?: string; time?: string }>();
  const courtId: CourtId = params.courtId === '2' ? '2' : '1';
  return (
    <ReservationFormScreen
      mode="create"
      initial={{ date: params.date ?? getTodayISO(), courtId, startTime: params.time ?? null }}
    />
  );
}
