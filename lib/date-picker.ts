import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { parseLocalDate, toISODate } from './time-utils';

/** Abre el calendario nativo y devuelve la fecha elegida (YYYY-MM-DD) por callback. */
export function pickDate(current: string, onPick: (date: string) => void) {
  if (Platform.OS === 'web') {
    pickDateWeb(current, onPick);
    return;
  }
  if (Platform.OS !== 'android') return;
  DateTimePickerAndroid.open({
    value: parseLocalDate(current),
    mode: 'date',
    onChange: (event, date) => {
      if (event.type === 'set' && date) onPick(toISODate(date));
    },
  });
}

let webInput: HTMLInputElement | null = null;
let webOnPick: ((date: string) => void) | null = null;

/** En la web (iPhone, PC) usa el calendario del navegador con un <input type="date"> oculto. */
function pickDateWeb(current: string, onPick: (date: string) => void) {
  if (!webInput) {
    webInput = document.createElement('input');
    webInput.type = 'date';
    webInput.setAttribute('aria-hidden', 'true');
    webInput.tabIndex = -1;
    Object.assign(webInput.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      width: '1px',
      height: '1px',
      opacity: '0',
      border: '0',
      padding: '0',
    });
    webInput.addEventListener('change', () => {
      if (webInput?.value) webOnPick?.(webInput.value);
    });
    document.body.appendChild(webInput);
  }
  webOnPick = onPick;
  webInput.value = current;
  try {
    webInput.showPicker();
  } catch {
    // Navegadores sin showPicker: enfocar el campo abre el calendario.
    webInput.focus();
    webInput.click();
  }
}
