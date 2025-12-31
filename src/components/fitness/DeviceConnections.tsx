'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Watch,
  Link,
  Unlink,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DeviceConnection {
  id: string;
  provider: string;
  displayName: string;
  icon: string;
  isConnected: boolean;
  syncEnabled: boolean;
  lastSyncAt: string | null;
}

interface DeviceConnectionsProps {
  familyId: string;
  personId: string;
}

const AVAILABLE_PROVIDERS = [
  {
    provider: 'garmin',
    displayName: 'Garmin Connect',
    icon: '⌚',
    description: 'Sync activities, heart rate, sleep, and steps from your Garmin watch',
    requiresCredentials: true,
  },
  {
    provider: 'ultrahuman',
    displayName: 'Ultrahuman Ring',
    icon: '💍',
    description: 'Sync sleep, HRV, recovery scores from your Ultrahuman Ring',
    requiresCredentials: false,
    comingSoon: true,
  },
];

const DeviceConnections: React.FC<DeviceConnectionsProps> = ({ familyId, personId }) => {
  const [devices, setDevices] = useState<DeviceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  // Garmin credentials form
  const [garminUsername, setGarminUsername] = useState('');
  const [garminPassword, setGarminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/families/${familyId}/devices?personId=${personId}`
      );
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load connected devices');
    } finally {
      setLoading(false);
    }
  }, [familyId, personId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleConnect = async (provider: string) => {
    if (provider === 'garmin') {
      setConnectingProvider('garmin');
      setConnectError(null);
      setConnectSuccess(false);
      return;
    }

    // For other providers that don't need credentials
    try {
      setConnecting(true);
      const response = await fetch(`/api/families/${familyId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, provider }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect');
      }

      await fetchDevices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleGarminConnect = async () => {
    if (!garminUsername || !garminPassword) {
      setConnectError('Please enter both username and password');
      return;
    }

    try {
      setConnecting(true);
      setConnectError(null);

      const response = await fetch(`/api/families/${familyId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
          provider: 'garmin',
          credentials: {
            username: garminUsername,
            password: garminPassword,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      setConnectSuccess(true);
      setGarminUsername('');
      setGarminPassword('');

      // Refresh devices list
      await fetchDevices();

      // Close form after success
      setTimeout(() => {
        setConnectingProvider(null);
        setConnectSuccess(false);
      }, 2000);
    } catch (err: any) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

    try {
      const response = await fetch(
        `/api/families/${familyId}/devices?personId=${personId}&provider=${provider}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to disconnect');

      await fetchDevices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSync = async (provider: string) => {
    try {
      setSyncing(provider);
      setError(null);

      const response = await fetch(`/api/families/${familyId}/devices/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      // Show success message
      if (data.results?.[provider]?.activitiesSynced !== undefined) {
        const count = data.results[provider].activitiesSynced;
        alert(`Synced ${count} new ${count === 1 ? 'activity' : 'activities'} from ${provider}`);
      }

      await fetchDevices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(null);
    }
  };

  const isConnected = (provider: string) => {
    return devices.some((d) => d.provider === provider && d.isConnected);
  };

  const getDevice = (provider: string) => {
    return devices.find((d) => d.provider === provider);
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.round(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Watch className="w-5 h-5" />
          Connected Devices
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {AVAILABLE_PROVIDERS.map((providerInfo) => {
          const connected = isConnected(providerInfo.provider);
          const device = getDevice(providerInfo.provider);
          const isExpanded = connectingProvider === providerInfo.provider;

          return (
            <div
              key={providerInfo.provider}
              className={`border rounded-xl overflow-hidden transition-all ${
                connected
                  ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                  : 'border-gray-200 dark:border-slate-700'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{providerInfo.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        {providerInfo.displayName}
                        {connected && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {providerInfo.comingSoon && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {providerInfo.description}
                      </p>
                      {connected && device?.lastSyncAt && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                          Last synced: {formatLastSync(device.lastSyncAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {connected ? (
                      <>
                        <button
                          onClick={() => handleSync(providerInfo.provider)}
                          disabled={syncing === providerInfo.provider}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50"
                          title="Sync now"
                        >
                          <RefreshCw
                            className={`w-5 h-5 ${
                              syncing === providerInfo.provider ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleDisconnect(providerInfo.provider)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Disconnect"
                        >
                          <Unlink className="w-5 h-5" />
                        </button>
                      </>
                    ) : providerInfo.comingSoon ? (
                      <span className="text-sm text-gray-400">Not available yet</span>
                    ) : (
                      <button
                        onClick={() => handleConnect(providerInfo.provider)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Link className="w-4 h-4" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Garmin credentials form */}
              {isExpanded && providerInfo.provider === 'garmin' && (
                <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
                  <div className="max-w-md space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Garmin Connect Email
                      </label>
                      <input
                        type="email"
                        value={garminUsername}
                        onChange={(e) => setGarminUsername(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Garmin Connect Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={garminPassword}
                          onChange={(e) => setGarminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {connectError && (
                      <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {connectError}
                      </div>
                    )}

                    {connectSuccess && (
                      <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Successfully connected to Garmin!
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleGarminConnect}
                        disabled={connecting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {connecting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Link className="w-4 h-4" />
                            Connect
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setConnectingProvider(null);
                          setConnectError(null);
                          setGarminUsername('');
                          setGarminPassword('');
                        }}
                        className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Your credentials are encrypted and stored securely. We never share your
                      login details.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400 mt-4">
        Connected devices will automatically sync your fitness data to give you a complete
        picture of your health and activity.
      </p>
    </div>
  );
};

export default DeviceConnections;
