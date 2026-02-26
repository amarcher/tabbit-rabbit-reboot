import React from 'react';
import './RainOverlay.css';

/**
 * Gentle rain overlay for the light lo-fi theme.
 *
 * Two layers of straight-down rain streaks (sparse/slow + dense/fast)
 * and five soft bokeh dots using radial-gradient backgrounds.
 *
 * Fully CSS-driven, no JS animation frames.
 * Respects prefers-reduced-motion via CSS (display: none).
 */
export default function RainOverlay() {
  return (
    <div className="tr-rain-overlay" aria-hidden="true">
      {/* Rain streaks */}
      <div className="tr-rain-layer tr-rain-layer--slow" />
      <div className="tr-rain-layer tr-rain-layer--fast" />

      {/* Bokeh dots — warm amber + cool blue-grey */}
      <div className="tr-rain-bokeh tr-rain-bokeh--1" />
      <div className="tr-rain-bokeh tr-rain-bokeh--2" />
      <div className="tr-rain-bokeh tr-rain-bokeh--3" />
      <div className="tr-rain-bokeh tr-rain-bokeh--4" />
      <div className="tr-rain-bokeh tr-rain-bokeh--5" />
    </div>
  );
}
