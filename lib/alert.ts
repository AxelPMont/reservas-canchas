import { Alert, Platform } from 'react-native';

/** Aviso simple con un botón. En la web Alert.alert no muestra nada, así que se usa el aviso del navegador. */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
