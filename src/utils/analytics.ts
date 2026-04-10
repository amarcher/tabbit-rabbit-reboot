// GA4 custom event helper
// https://developers.google.com/analytics/devguides/collection/ga4/reference/events

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

export function trackShare(method: 'native_share' | 'clipboard') {
  trackEvent('share', { content_type: 'bill', method });
}

export function trackReceiptScan(mode: 'free' | 'byok') {
  trackEvent('receipt_scan', { mode });
}

export function trackTabCreate() {
  trackEvent('tab_create');
}

export function trackVoiceAssignment(mode: 'free' | 'byok') {
  trackEvent('voice_assignment', { mode });
}
