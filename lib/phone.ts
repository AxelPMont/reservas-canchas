import { Linking } from 'react-native';

/** Código de país que se agrega a los números de 9 dígitos (Perú). */
export const DEFAULT_COUNTRY_CODE = '51';

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** "987654321" → "987 654 321" */
export function formatPhone(phone: string): string {
  const d = digitsOnly(phone);
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : phone;
}

function internationalNumber(phone: string): string {
  const d = digitsOnly(phone);
  return d.length === 9 ? DEFAULT_COUNTRY_CODE + d : d;
}

export function openWhatsApp(phone: string, message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return Linking.openURL(`https://wa.me/${internationalNumber(phone)}${text}`);
}

export function callPhone(phone: string) {
  return Linking.openURL(`tel:${digitsOnly(phone)}`);
}
