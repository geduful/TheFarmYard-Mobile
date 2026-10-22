/**
 * Design tokens mirrored from the web app's globals.css so the two surfaces
 * read as the same product. Keep this file dumb: values only, no logic.
 */

export const colors = {
  farmGreen: '#1E4620',
  farmGreenLight: '#2D6A30',
  farmGreenDark: '#143015',
  earth: '#8B6914',
  earthLight: '#A0782C',
  cream: '#F5F0E8',
  creamDark: '#EDE6D5',
  alertRed: '#DC2626',
  alertOrange: '#D97706',
  emerald: '#059669',
  emeraldLight: '#10B981',
  background: '#FFFFFF',
  surface: '#FAFAF8',
  text: '#171717',
  muted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  hero: 28,
} as const;
