import { RabbitColor, COLOR_HEX } from '../types';

export function getGradientStyle(colors: RabbitColor[]): React.CSSProperties {
  if (colors.length === 0) return {};
  if (colors.length === 1) {
    return { backgroundColor: COLOR_HEX[colors[0]] };
  }

  const sorted = sortColors(colors);
  const stops = sorted.map((color, i) => {
    const pct = sorted.length === 1 ? 0 : (i / (sorted.length - 1)) * 100;
    return `${COLOR_HEX[color]} ${pct}%`;
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
