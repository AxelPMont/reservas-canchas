import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Colors, CourtColors, Fonts, Radius } from '@/constants/theme';
import type { CourtId } from '@/types/reservation';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const v = buttonVariants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        v.container,
        inactive && variant === 'primary' && styles.buttonDisabled,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.color} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={inactive && variant === 'primary' ? Colors.textMuted : v.color} />}
          <Text style={[styles.buttonText, { color: inactive && variant === 'primary' ? Colors.textMuted : v.color }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { container: { backgroundColor: Colors.primary }, color: Colors.onPrimary },
  outline: { container: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface }, color: Colors.text },
  danger: { container: { borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)' }, color: Colors.dangerText },
  ghost: { container: {}, color: Colors.primary },
};

type FieldProps = TextInputProps & {
  label?: string;
  icon?: IconName;
  prefix?: string;
  right?: React.ReactNode;
  focused?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Field({ label, icon, prefix, right, focused, containerStyle, style, ...input }: FieldProps) {
  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, focused && { borderColor: Colors.primary }]}>
        {icon && <Ionicons name={icon} size={20} color={Colors.textMuted} />}
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          placeholderTextColor={Colors.textFaint}
          accessibilityLabel={label ?? input.placeholder}
          style={[styles.input, style]}
          {...input}
        />
        {right}
      </View>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
    >
      <Text style={[styles.chipText, { color: selected ? Colors.onPrimary : Colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export function CourtBadge({ courtId, short }: { courtId: CourtId; short?: boolean }) {
  const c = CourtColors[courtId];
  return (
    <View style={[styles.badge, { backgroundColor: c.fill }]}>
      <View style={[styles.dot, { backgroundColor: c.solid }]} />
      <Text style={[styles.badgeText, { color: c.text }]}>{short ? `C${courtId}` : `Cancha ${courtId}`}</Text>
    </View>
  );
}

export function DepositBadge({ amount }: { amount?: number | null }) {
  if (amount != null && amount > 0) {
    return (
      <View style={[styles.badge, { backgroundColor: 'rgba(52,211,153,0.16)' }]}>
        <Text style={[styles.badgeText, { color: Colors.depositText }]}>Adelanto S/ {formatMoney(amount)}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { borderWidth: 1, borderColor: Colors.border }]}>
      <Text style={[styles.badgeText, { color: Colors.textMuted }]}>Sin adelanto</Text>
    </View>
  );
}

export function formatMoney(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[styles.toggle, { backgroundColor: value ? Colors.deposit : Colors.border }]}
    >
      <View
        style={[
          styles.toggleKnob,
          value ? { right: 3, backgroundColor: Colors.onDeposit } : { left: 3, backgroundColor: Colors.textMuted },
        ]}
      />
    </Pressable>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  buttonDisabled: { backgroundColor: Colors.surfaceRaised },
  buttonText: { fontFamily: Fonts.display, fontSize: 18 },
  label: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  prefix: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.textMuted },
  input: { flex: 1, color: Colors.text, fontFamily: Fonts.medium, fontSize: 16, paddingVertical: 12 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  chipSelected: { backgroundColor: Colors.primary },
  chipIdle: { borderWidth: 1, borderColor: Colors.border },
  chipText: { fontFamily: Fonts.semibold, fontSize: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
  },
  toggle: { width: 52, height: 32, borderRadius: 16 },
  toggleKnob: { position: 'absolute', top: 3, width: 26, height: 26, borderRadius: 13 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(56,189,248,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.text, textAlign: 'center' },
  emptySubtitle: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
