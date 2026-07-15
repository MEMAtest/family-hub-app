export type OwnedEventName =
  | 'lead_submitted'
  | 'signup_completed'
  | 'demo_requested'
  | 'download_completed'
  | 'checkout_started'
  | 'purchase_completed';

export type OwnedEventProperties = Record<string, string | number | boolean>;

type OwnedAnalyticsWindow = Window & {
  ownedPortfolioTrack?: (
    eventName: OwnedEventName,
    properties?: OwnedEventProperties,
  ) => boolean;
  ownedPortfolioQueue?: Array<[OwnedEventName, OwnedEventProperties]>;
};

export function trackOwnedEvent(
  eventName: OwnedEventName,
  properties: OwnedEventProperties = {},
): boolean {
  if (typeof window === 'undefined') return false;

  const analyticsWindow = window as OwnedAnalyticsWindow;
  if (typeof analyticsWindow.ownedPortfolioTrack === 'function') {
    return analyticsWindow.ownedPortfolioTrack(eventName, properties);
  }

  analyticsWindow.ownedPortfolioQueue = analyticsWindow.ownedPortfolioQueue || [];
  analyticsWindow.ownedPortfolioQueue.push([eventName, properties]);
  return true;
}
