import { RabbitColor, COLOR_HEX } from '../types';

export function getGradientStyle(colors: RabbitColor[]): React.CSSProperties {
  if (colors.length === 0) return {};
  if (colors.length === 1) {
    return { backgroundColor: COLOR_HEX[colors[0]] };
  }

  const sorted = sortColors(colors);
  const bandSize = 100 / sorted.length;
  const blend = 3; // percentage of transition between bands
  const stops: string[] = [];
  sorted.forEach((color, i) => {
    const start = i * bandSize;
    const end = (i + 1) * bandSize;
    stops.push(`${COLOR_HEX[color]} ${Math.max(0, start + (i > 0 ? blend : 0))}%`);
    stops.push(`${COLOR_HEX[color]} ${Math.min(100, end - (i < sorted.length - 1 ? blend : 0))}%`);
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

function sortColors(colors: RabbitColor[]): RabbitColor[] {
  return [...colors].sort(
    (a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b)
  );
}
