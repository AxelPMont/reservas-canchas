/**
 * Tema CourtManager: oscuro con acentos verdes (gestión de canchas deportivas).
 */

import { Platform } from 'react-native';

export const CourtManagerColors = {
  background: '#0f0f0f',
  surface: '#1a1a1a',
  card: '#252525',
  cardBorder: '#2d2d2d',
  text: '#ffffff',
  textMuted: '#9ca3af',
  primary: '#22c55e',
  primaryDark: '#16a34a',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.25)',
  occupied: '#dc2626',
  todayBadge: '#22c55e',
  futureAccent: '#3b82f6',
  tabInactive: '#6b7280',
};

const tintColorLight = '#0a7ea4';
const tintColorDark = CourtManagerColors.primary;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: CourtManagerColors.text,
    background: CourtManagerColors.background,
    tint: tintColorDark,
    icon: CourtManagerColors.textMuted,
    tabIconDefault: CourtManagerColors.tabInactive,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
