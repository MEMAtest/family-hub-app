export type PushDeviceStatus = {
  configured: boolean;
  activeDevices: number;
  currentDevice: { id: string; isActive: boolean; lastSeenAt: string } | null;
};

export function pushDeviceReadiness(input: {
  secure: boolean; supported: boolean; permission: NotificationPermission;
  enabled: boolean; subscribed: boolean; server: PushDeviceStatus | null;
}): { connection: string; subscriptionId?: string } {
  if (!input.secure) return { connection: 'Open the HTTPS app on the intended phone.' };
  if (!input.supported) return { connection: 'Push is unavailable in this browser. On iPhone or iPad, open the installed Home Screen app.' };
  if (input.permission === 'denied') return { connection: 'Notifications are blocked. Allow this app in browser and phone notification settings.' };
  if (input.permission !== 'granted') return { connection: 'Enable push and allow notifications on this phone.' };
  if (!input.enabled) return { connection: 'Enable notifications and push for this device.' };
  if (!input.subscribed) return { connection: 'This browser has no push subscription. Enable push on the intended phone.' };
  if (!input.server) return { connection: 'Server registration check unavailable. Reconnect and retry; no device test was sent.' };
  if (!input.server.configured) return { connection: 'Server push is not configured. Ask the administrator to configure push delivery.' };
  if (!input.server.currentDevice) return { connection: 'This browser is not registered for your signed-in member. Re-enable push here.' };
  if (!input.server.currentDevice.isActive) return { connection: 'This device subscription is inactive or expired. Re-enable push here.' };
  return { connection: 'This browser is registered for your member. Closed-app receipt still needs a phone check.',
    subscriptionId: input.server.currentDevice.id };
}
