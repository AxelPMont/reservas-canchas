import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourtManagerColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export function HeaderLogoutButton() {
  const { signOut } = useAuth();
  return (
    <TouchableOpacity
      onPress={() => signOut()}
      style={{ padding: 8, marginRight: 8 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="log-out-outline" size={24} color={CourtManagerColors.danger} />
    </TouchableOpacity>
  );
}
