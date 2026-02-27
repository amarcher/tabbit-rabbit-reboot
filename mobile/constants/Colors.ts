import { colors } from '@/src/utils/theme';

const tintColorLight = colors.accent;
const tintColorDark = '#fff';

export default {
  light: {
    text: colors.text,
    background: colors.bg,
    tint: tintColorLight,
    tabIconDefault: colors.muted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};
