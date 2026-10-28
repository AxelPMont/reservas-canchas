import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { parseLocalDate, toISODate } from './time-utils';

/** Abre el calendario nativo y devuelve la fecha elegida (YYYY-MM-DD) por callback. */
export function pickDate(current: string, onPick: (date: string) => void) {
  if (Platform.OS !== 'android') return;
  DateTimePickerAndroid.open({
    value: parseLocalDate(current),
    mode: 'date',
    onChange: (event, date) => {
      if (event.type === 'set' && date) onPick(toISODate(date));
    },
  });
}
