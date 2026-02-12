import { RabbitColor, COLOR_HEX } from '../types';

const COLOR_ORDER: RabbitColor[] = [
  'success',
  'info',
  'warning',
  'danger',
  'primary',
  'secondary',
];

function sortColors(colors: RabbitColor[]): RabbitColor[] {
  return [...colors].sort(
    (a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b)
  );
}

/** Returns a tuple of hex color strings for use with expo-linear-gradient */
export function getGradientColors(colors: RabbitColor[]): [string, string, ...string[]] {
  if (colors.length === 0) return ['#ffffff', '#ffffff'];
  if (colors.length === 1) return [COLOR_HEX[colors[0]], COLOR_HEX[colors[0]]];
  const sorted = sortColors(colors).map((c) => COLOR_HEX[c]);
  return [sorted[0], sorted[1], ...sorted.slice(2)];
}

/** Bootstrap-like color mapping for buttons/badges */
export const BUTTON_COLORS: Record<RabbitColor, { bg: string; text: string; border: string }> = {
  success: { bg: '#198754', text: '#ffffff', border: '#198754' },
  info: { bg: '#0dcaf0', text: '#000000', border: '#0dcaf0' },
  warning: { bg: '#ffc107', text: '#000000', border: '#ffc107' },
  danger: { bg: '#dc3545', text: '#ffffff', border: '#dc3545' },
  primary: { bg: '#0d6efd', text: '#ffffff', border: '#0d6efd' },
  secondary: { bg: '#6c757d', text: '#ffffff', border: '#6c757d' },
};

export const BUTTON_OUTLINE_COLORS: Record<RabbitColor, { bg: string; text: string; border: string }> = {
  success: { bg: 'transparent', text: '#198754', border: '#198754' },
  info: { bg: 'transparent', text: '#0dcaf0', border: '#0dcaf0' },
  warning: { bg: 'transparent', text: '#ffc107', border: '#ffc107' },
  danger: { bg: 'transparent', text: '#dc3545', border: '#dc3545' },
  primary: { bg: 'transparent', text: '#0d6efd', border: '#0d6efd' },
  secondary: { bg: 'transparent', text: '#6c757d', border: '#6c757d' },
};
