// Track custom events to Plausible Analytics
// Plausible is privacy-friendly and doesn't require cookie consent
// See: https://plausible.io/docs/custom-event-goals

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void
  }
}

/**
 * Track a custom event to Plausible Analytics
 * @param name - The event name (e.g., 'file_upload', 'explain_rung')
 * @param props - Optional properties to attach to the event
 */
export function trackEvent(name: string, props?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(name, { props })
  }
}
