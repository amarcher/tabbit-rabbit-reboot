import { ViewStyle } from 'react-native';

/**
 * Warm parchment "lo-fi chill light" design tokens.
 * Mirrors the web app's CSS custom properties from src/index.css.
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  /** Warm parchment background */
  bg: '#ece8e0',
  /** Semi-transparent white surface (solid approximation for RN) */
  surface: '#f5f2ec',
  /** Subtle soft border (solid approximation) */
  border: '#e8e4dc',
  /** Dark brown text */
  text: '#3a3632',
  /** Muted taupe secondary text */
  muted: '#8a847a',
  /** Warm golden amber — primary action */
  accent: '#e8a838',
  /** Accent glow halo (for shadow tinting) */
  accentGlow: 'rgba(232, 168, 56, 0.2)',
  /** Cool blue-gray secondary */
  sky: '#8a9bab',
  /** Dark chocolate navbar / tab bar */
  navBg: '#2d2a26',
  /** Light text on dark chrome (nav bars, tab bars) */
  navText: '#fff',

  // Semantic aliases
  /** Input / card background — slightly warmer white */
  inputBg: '#faf8f4',
  /** Placeholder text */
  placeholder: '#b0a99e',
  /** Destructive / error red (kept standard) */
  danger: '#dc3545',
  /** Warning background (warm amber tint) */
  warningBg: '#fdf4e0',
  /** Warning text */
  warningText: '#8a6d20',
  /** Link / interactive text */
  link: '#e8a838',
} as const;

// ---------------------------------------------------------------------------
// Shadows (warm-tinted)
// ---------------------------------------------------------------------------

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

/** Subtle card shadow */
export const shadow1: ShadowStyle = {
  shadowColor: '#a08c64',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

/** Medium elevation shadow */
export const shadow2: ShadowStyle = {
  shadowColor: '#a08c64',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 4,
};

/** Highest elevation — modals, toasts */
export const shadow3: ShadowStyle = {
  shadowColor: '#a08c64',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 28,
  elevation: 8,
};

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// ---------------------------------------------------------------------------
// Timing (milliseconds, for Animated / reanimated)
// ---------------------------------------------------------------------------

export const timing = {
  fast: 220,
  normal: 350,
  slow: 500,
} as const;

// ---------------------------------------------------------------------------
// Border radii
// ---------------------------------------------------------------------------

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 20,
} as const;

// ---------------------------------------------------------------------------
// Fonts (Google Fonts loaded in _layout.tsx)
// ---------------------------------------------------------------------------

export const fonts = {
  body: 'Nunito_400Regular',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  heading: 'DMSans_700Bold',
  headingSemiBold: 'DMSans_600SemiBold',
} as const;
