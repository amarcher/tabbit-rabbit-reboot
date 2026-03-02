import { RabbitColor, COLOR_HEX } from '../types';

export function getGradientStyle(
  colors: RabbitColor[],
  shares?: number[],
): React.CSSProperties {
  if (colors.length === 0) return {};
  if (colors.length === 1) {
    return { backgroundColor: COLOR_HEX[colors[0]] };
  }

  const sorted = sortColorsWithShares(colors, shares);
  const totalShares = sorted.reduce((sum, s) => sum + s.share, 0);
  const blend = 3;
  const stops: string[] = [];
  let cursor = 0;
  sorted.forEach((entry, i) => {
    const bandSize = (entry.share / totalShares) * 100;
    const start = cursor;
    const end = cursor + bandSize;
    stops.push(`${COLOR_HEX[entry.color]} ${Math.max(0, start + (i > 0 ? blend : 0))}%`);
    stops.push(`${COLOR_HEX[entry.color]} ${Math.min(100, end - (i < sorted.length - 1 ? blend : 0))}%`);
    cursor = end;
  });

  return {
    background: `linear-gradient(to right, ${stops.join(', ')})`,
  };
}

const COLOR_ORDER: RabbitColor[] = [
  'success',
  'info',
  'warning',
  'danger',
  'primary',
  'secondary',
];

interface ColorWithShare {
  color: RabbitColor;
  share: number;
}

function sortColorsWithShares(colors: RabbitColor[], shares?: number[]): ColorWithShare[] {
  const entries: ColorWithShare[] = colors.map((color, i) => ({
    color,
    share: shares?.[i] ?? 1,
  }));
  return entries.sort(
    (a, b) => COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color)
  );
}
