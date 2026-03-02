import { RabbitColor, COLOR_HEX } from '../types';

const COLOR_ORDER: RabbitColor[] = [
  'success',
  'info',
  'warning',
  'danger',
  'primary',
  'secondary',
];

/** More saturated gradient colors — bolder than the pastel COLOR_HEX */
const GRADIENT_HEX: Record<RabbitColor, string> = {
  success: '#6ec985',
  info: '#5cd6e8',
  warning: '#ffd24d',
  danger: '#f08a93',
  primary: '#6aabf0',
  secondary: '#a8abaf',
};

function sortColors(colors: RabbitColor[]): RabbitColor[] {
  return [...colors].sort(
    (a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b)
  );
}

interface GradientResult {
  colors: [string, string, ...string[]];
  locations?: [number, number, ...number[]];
}

/** Returns gradient colors and optional locations for use with expo-linear-gradient.
 *  When shares are provided, locations reflect proportional band widths. */
export function getGradientColors(
  colors: RabbitColor[],
  shares?: number[],
): GradientResult {
  if (colors.length === 0) return { colors: ['#ffffff', '#ffffff'] };
  if (colors.length === 1) return { colors: [GRADIENT_HEX[colors[0]], GRADIENT_HEX[colors[0]]] };

  const entries = colors.map((c, i) => ({ color: c, share: shares?.[i] ?? 1 }));
  const sorted = entries.sort(
    (a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
  );

  const hasCustomShares = shares && shares.some((s) => s !== 1);

  if (!hasCustomShares) {
    // Equal shares — simple color list, no locations needed
    const sortedColors = sorted.map((e) => GRADIENT_HEX[e.color]);
    return { colors: [sortedColors[0], sortedColors[1], ...sortedColors.slice(2)] };
  }

  // Proportional shares — duplicate colors for hard stops with small blend
  const totalShares = sorted.reduce((sum, e) => sum + e.share, 0);
  const blend = 0.03; // 3% transition
  const resultColors: string[] = [];
  const locs: number[] = [];
  let cursor = 0;

  sorted.forEach((entry, i) => {
    const bandSize = entry.share / totalShares;
    const start = cursor;
    const end = cursor + bandSize;
    resultColors.push(GRADIENT_HEX[entry.color]);
    locs.push(Math.max(0, start + (i > 0 ? blend : 0)));
    resultColors.push(GRADIENT_HEX[entry.color]);
    locs.push(Math.min(1, end - (i < sorted.length - 1 ? blend : 0)));
    cursor = end;
  });

  return {
    colors: [resultColors[0], resultColors[1], ...resultColors.slice(2)] as [string, string, ...string[]],
    locations: [locs[0], locs[1], ...locs.slice(2)] as [number, number, ...number[]],
  };
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
