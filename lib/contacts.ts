import { Alert, Linking } from 'react-native';
import { DEFAULT_COUNTRY_CODE, digitsOnly, formatPhone } from './phone';

export type PickedContact = { name: string; phone: string };

/** "+51 987 654 321" → "987654321" (los números locales se guardan sin el código de país). */
function normalizePhone(raw: string): string {
  const d = digitsOnly(raw);
  if (d.length === 9 + DEFAULT_COUNTRY_CODE.length && d.startsWith(DEFAULT_COUNTRY_CODE)) {
    return d.slice(DEFAULT_COUNTRY_CODE.length);
  }
  return d;
}

function choosePhone(name: string, phones: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      name,
      'Elige el número',
      [
        ...phones.slice(0, 3).map((p) => ({ text: formatPhone(p), onPress: () => resolve(p) })),
        { text: 'Cancelar', style: 'cancel' as const, onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

/** Abre los contactos del celular y devuelve el nombre y el teléfono elegidos. */
export async function pickContactPhone(): Promise<PickedContact | null> {
  // Se carga recién al usarlo: si el módulo nativo no está en la app instalada,
  // falla solo este botón y no toda la pantalla de reservas.
  let Contacts: typeof import('expo-contacts');
  try {
    Contacts = await import('expo-contacts');
  } catch {
    Alert.alert('Contactos no disponibles', 'Esta versión de la app no incluye el acceso a contactos.');
    return null;
  }

  const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Sin acceso a contactos',
      'Para importar un número, permite el acceso a tus contactos.',
      canAskAgain
        ? [{ text: 'Entendido' }]
        : [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
          ]
    );
    return null;
  }

  const contact = await Contacts.presentContactPickerAsync();
  if (!contact) return null;

  const name = contact.name ?? [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  const phones = [...new Set((contact.phoneNumbers ?? []).map((p) => normalizePhone(p.number ?? '')).filter(Boolean))];
  if (phones.length === 0) {
    Alert.alert('Sin número', `${name || 'Este contacto'} no tiene un teléfono guardado.`);
    return null;
  }
  const phone = phones.length === 1 ? phones[0] : await choosePhone(name, phones);
  return phone ? { name, phone } : null;
}
