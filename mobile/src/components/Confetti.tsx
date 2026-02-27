import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';

// Rabbit palette confetti colors
const CONFETTI_COLORS = [
  '#6ec985',
  '#6ecfc9',
  '#f0c75e',
  '#e8766e',
  '#6ea8e8',
  '#a0a0a0',
  '#e8a838',
  '#8a9bab',
];

type ParticleShape = 'square' | 'circle' | 'rect';

interface ParticleConfig {
  id: number;
  color: string;
  shape: ParticleShape;
  angle: number;
  distance: number;
  rotation: number;
  size: number;
  delay: number;
}

export interface ConfettiProps {
  origin?: { x: number; y: number };
  count?: number;
  onComplete?: () => void;
}

const SHAPES: ParticleShape[] = ['square', 'circle', 'rect'];

function generateParticles(count: number): ParticleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    angle: Math.random() * Math.PI * 2,
    distance: 80 + Math.random() * 180,
    rotation: Math.random() * 720 - 360,
    size: 6 + Math.random() * 6,
    delay: Math.random() * 100,
  }));
}

function Particle({
  config,
  originX,
  originY,
}: {
  config: ParticleConfig;
  originX: number;
  originY: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withSpring(1, { damping: 12, stiffness: 90, mass: 0.8 })
    );
    opacity.value = withDelay(
      config.delay + 800,
      withTiming(0, { duration: 600, easing: Easing.in(Easing.quad) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const dx = Math.cos(config.angle) * config.distance * p;
    const burstDy = Math.sin(config.angle) * config.distance * p;
    const gravity = 200 * p * p;
    const dy = burstDy + gravity;

    return {
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${config.rotation * p}deg` },
        { scale: 1 - p * 0.3 },
      ],
      opacity: opacity.value,
    };
  });

  const dims = useMemo(() => {
    switch (config.shape) {
      case 'circle':
        return { width: config.size, height: config.size, borderRadius: config.size / 2 };
      case 'rect':
        return { width: config.size * 0.5, height: config.size * 1.6, borderRadius: 2 };
      default:
        return { width: config.size, height: config.size * 0.7, borderRadius: 2 };
    }
  }, [config.shape, config.size]);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: originX - dims.width / 2,
          top: originY - dims.height / 2,
          width: dims.width,
          height: dims.height,
          borderRadius: dims.borderRadius,
          backgroundColor: config.color,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function Confetti({ origin, count = 36, onComplete }: ConfettiProps) {
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const originX = origin?.x ?? screenW / 2;
  const originY = origin?.y ?? screenH * 0.4;
  const particles = useMemo(() => generateParticles(count), [count]);

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={[styles.overlay, { width: screenW, height: screenH }]} pointerEvents="none">
      {particles.map((p) => (
        <Particle key={p.id} config={p} originX={originX} originY={originY} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, zIndex: 1000 },
});
