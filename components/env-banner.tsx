import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_PRODUCTION } from '@/lib/env';
import { firebaseProjectId } from '@/lib/firebase';

/**
 * Etiqueta visible solo en la app de pruebas, para no confundirla con la real.
 * Va centrada dentro de la barra de estado para no tapar el contenido.
 */
export function EnvBanner() {
  const insets = useSafeAreaInsets();
  if (IS_PRODUCTION) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: Math.max(2, insets.top / 2 - 8) }]}>
      <Text style={styles.text}>DEV · {firebaseProjectId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 1,
    zIndex: 1000,
  },
  text: { color: '#1f1300', fontSize: 10, fontWeight: '700' },
});
