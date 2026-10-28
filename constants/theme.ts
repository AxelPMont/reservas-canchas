/**
 * Tema Sport Diamante: fondo azul casi negro, azul "diamante" como acento y plata.
 * Colores tomados del logo.
 */

import type { CourtId } from '@/types/reservation';

export const Colors = {
  background: '#0B1220',
  surface: '#111A2C',
  surfaceRaised: '#16223A',
  tabBar: '#0E1626',
  border: '#22314D',
  borderSoft: '#1C2942',
  borderDashed: '#4A5B7A',

  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textFaint: '#8A9BB4',

  primary: '#38BDF8', // diamante
  primaryDeep: '#0369A1',
  primaryLight: '#7DD3FC',
  primaryPale: '#BAE6FD',
  onPrimary: '#04121F',

  amethyst: '#A78BFA', // Cancha 2
  amethystLight: '#C4B5FD',
  amethystPale: '#DDD6FE',

  deposit: '#34D399',
  depositText: '#6EE7B7',
  onDeposit: '#052E1F',

  danger: '#F87171',
  dangerText: '#FCA5A5',
  onDanger: '#1F0A0A',

  warning: '#FBBF24',
  devBadge: '#F59E0B',
};

/** Color de cada cancha: Cancha 1 azul diamante, Cancha 2 violeta amatista. */
export const CourtColors: Record<CourtId, { solid: string; text: string; fill: string; border: string; sub: string }> = {
  '1': {
    solid: Colors.primary,
    text: Colors.primaryLight,
    fill: 'rgba(56,189,248,0.18)',
    border: 'rgba(56,189,248,0.45)',
    sub: Colors.primaryPale,
  },
  '2': {
    solid: Colors.amethyst,
    text: Colors.amethystLight,
    fill: 'rgba(167,139,250,0.18)',
    border: 'rgba(167,139,250,0.45)',
    sub: Colors.amethystPale,
  },
};

export const Fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  display: 'BarlowSemiCondensed_700Bold',
  displayHeavy: 'BarlowSemiCondensed_800ExtraBold',
};

export const Radius = { sm: 8, md: 12, lg: 14, xl: 18, pill: 999 };
