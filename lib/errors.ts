import { FirebaseError } from 'firebase/app';
import { ReservationConflictError, ReservationLockedError } from './reservations';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/user-disabled': 'Este usuario está deshabilitado. Habla con el administrador.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión a internet. Revisa tu conexión.',
  'permission-denied': 'No tienes permiso para hacer esto.',
  unavailable: 'Sin conexión con el servidor. Revisa tu internet.',
  aborted: 'Otro usuario modificó estos datos al mismo tiempo. Inténtalo de nuevo.',
};

/** Convierte cualquier error en un mensaje claro en español. */
export function friendlyError(e: unknown, fallback = 'Ocurrió un error. Inténtalo de nuevo.'): string {
  if (e instanceof ReservationConflictError || e instanceof ReservationLockedError) return e.message;
  if (e instanceof FirebaseError) return MESSAGES[e.code] ?? fallback;
  return fallback;
}
