import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { CourtManagerColors } from '@/constants/theme';

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={CourtManagerColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CourtManagerColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
