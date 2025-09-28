'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  Settings,
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  Zap,
  Shield,
  Globe,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import googleCalendarService, { GoogleCalendarInfo, GoogleCalendarSettings, SyncResult } from '@/services/googleCalendarService'
import { CalendarEvent } from '@/types/calendar.types'

interface GoogleCalendarSyncProps {
  events?: CalendarEvent[]
  onSyncComplete?: (result: SyncResult) => void
}

const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({
  events = [],
  onSyncComplete
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([])
  const [settings, setSettings] = useState<GoogleCalendarSettings>({
    enabled: false,
    selectedCalendars: [],
    syncDirection: 'both',
    autoSync: true,
    syncInterval: 30
  })
  const [syncStatus, setSyncStatus] = useState<SyncResult | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState<{
    phase: string
    progress: number
    message: string
  } | null>(null)

  useEffect(() => {
    checkAuthStatus()
    loadSettings()
  }, [])

  const checkAuthStatus = () => {
    const authenticated = googleCalendarService.isAuthenticated()
    setIsAuthenticated(authenticated)

    if (authenticated) {
      loadCalendars()
    }
  }

  const loadSettings = () => {
    // Load settings from localStorage or API
    const stored = localStorage.getItem('google_calendar_settings')
    if (stored) {
      setSettings(JSON.parse(stored))
    }
  }

  const saveSettings = (newSettings: GoogleCalendarSettings) => {
    setSettings(newSettings)
    localStorage.setItem('google_calendar_settings', JSON.stringify(newSettings))
  }

  const loadCalendars = async () => {
    try {
      const calendarList = await googleCalendarService.getCalendarList()
      setCalendars(calendarList)
    } catch (error) {
      console.error('Failed to load calendars:', error)
      setError('Failed to load Google Calendars')
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setError(null)

      const authUrl = googleCalendarService.getAuthUrl()

      // Open popup window for OAuth
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      // Listen for messages from the popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'google_calendar_auth_success') {
          window.removeEventListener('message', messageListener)
          setIsConnecting(false)
          checkAuthStatus()
        } else if (event.data.type === 'google_calendar_auth_error') {
          window.removeEventListener('message', messageListener)
          setIsConnecting(false)
          setError('Failed to authenticate with Google Calendar')
        }
      }

      window.addEventListener('message', messageListener)

      // Fallback: poll for popup closure
      const pollTimer = setInterval(() => {
        try {
          if (popup?.closed) {
            clearInterval(pollTimer)
            window.removeEventListener('message', messageListener)
            setIsConnecting(false)
            checkAuthStatus()
          }
        } catch (error) {
          // Ignore cross-origin errors
        }
      }, 1000)

    } catch (error) {
      console.error('Connection error:', error)
      setError('Failed to connect to Google Calendar')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await googleCalendarService.disconnect()
      setIsAuthenticated(false)
      setCalendars([])
      setSyncStatus(null)
      saveSettings({
        ...settings,
        enabled: false,
        selectedCalendars: []
      })
    } catch (error) {
      console.error('Disconnect error:', error)
      setError('Failed to disconnect from Google Calendar')
    }
  }

  const handleSync = async () => {
    if (!isAuthenticated) return

    try {
      setIsSyncing(true)
      setError(null)
      setSyncProgress({
        phase: 'Initializing',
        progress: 0,
        message: 'Preparing to sync calendars...'
      })

      // Phase 1: Authentication check
      setSyncProgress({
        phase: 'Authentication',
        progress: 10,
        message: 'Verifying Google Calendar access...'
      })

      // Phase 2: Fetching Google Calendar data
      setSyncProgress({
        phase: 'Fetching',
        progress: 30,
        message: 'Fetching Google Calendar events...'
      })

      // Phase 3: Conflict detection
      setSyncProgress({
        phase: 'Analysis',
        progress: 50,
        message: 'Analyzing events for conflicts...'
      })

      // Phase 4: Sync operation
      setSyncProgress({
        phase: 'Syncing',
        progress: 70,
        message: 'Synchronizing events...'
      })

      const familyHubEvents = events
      const result = await googleCalendarService.syncCalendars(familyHubEvents, settings)

      // Phase 5: Completion
      setSyncProgress({
        phase: 'Completing',
        progress: 90,
        message: 'Finalizing sync...'
      })

      setSyncStatus(result)
      onSyncComplete?.(result)

      setSyncProgress({
        phase: 'Complete',
        progress: 100,
        message: `Sync completed! ${result.imported} imported, ${result.exported} exported, ${result.updated} updated`
      })

      // Clear progress after 3 seconds
      setTimeout(() => setSyncProgress(null), 3000)

      if (!result.success) {
        setError(`Sync completed with ${result.errors.length} errors`)
      }

    } catch (error) {
      console.error('Sync error:', error)
      setError('Failed to sync calendars')
      setSyncProgress(null)
    } finally {
      setIsSyncing(false)
    }
  }

  const toggleCalendar = (calendarId: string) => {
    const newSelected = settings.selectedCalendars.includes(calendarId)
      ? settings.selectedCalendars.filter(id => id !== calendarId)
      : [...settings.selectedCalendars, calendarId]

    saveSettings({
      ...settings,
      selectedCalendars: newSelected,
      enabled: newSelected.length > 0
    })
  }

  const updateSyncDirection = (direction: 'import' | 'export' | 'both') => {
    saveSettings({ ...settings, syncDirection: direction })
  }

  const updateAutoSync = (enabled: boolean) => {
    saveSettings({ ...settings, autoSync: enabled })
  }

  const updateSyncInterval = (interval: number) => {
    saveSettings({ ...settings, syncInterval: interval })
  }

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Globe className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Google Calendar Sync</h2>
          <p className="text-sm text-gray-600">Connect and sync with your Google Calendar</p>
        </div>
      </div>

      <div>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {syncProgress && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">{syncProgress.phase}</span>
                <span className="text-sm text-blue-700">{syncProgress.progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${syncProgress.progress}%` }}
                />
              </div>
              <p className="text-sm text-blue-700">{syncProgress.message}</p>
            </div>
          )}

          {!isAuthenticated ? (
            /* Connection Section */
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Google Calendar</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Sync your Family Hub events with Google Calendar to keep everything in sync across all your devices.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Secure OAuth 2.0 authentication</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Two-way sync keeps everything up to date</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Settings className="w-4 h-4 text-purple-600" />
                  <span>Full control over which calendars to sync</span>
                </div>
              </div>

              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Connect Google Calendar
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Settings Section */
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-900">Connected to Google Calendar</h3>
                    <p className="text-sm text-green-700">
                      {settings.lastSync
                        ? `Last synced: ${new Date(settings.lastSync).toLocaleString()}`
                        : 'Ready to sync'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing || settings.selectedCalendars.length === 0}
                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sync Now
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Calendar Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Select Calendars to Sync</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {calendars.map(calendar => (
                    <div
                      key={calendar.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: calendar.backgroundColor || '#4285F4' }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{calendar.summary}</p>
                          {calendar.description && (
                            <p className="text-sm text-gray-600">{calendar.description}</p>
                          )}
                          {calendar.primary && (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.selectedCalendars.includes(calendar.id)}
                        onChange={() => toggleCalendar(calendar.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync Direction */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Sync Direction</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'import', label: 'Import Only', icon: Download, desc: 'Google → Family Hub' },
                    { value: 'export', label: 'Export Only', icon: Upload, desc: 'Family Hub → Google' },
                    { value: 'both', label: 'Two-Way Sync', icon: RefreshCw, desc: 'Keep both in sync' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateSyncDirection(option.value as any)}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        settings.syncDirection === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <option.icon className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-gray-600">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Sync Settings */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Automatic Sync</h4>
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={(e) => updateAutoSync(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {settings.autoSync && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Sync Interval (minutes)
                    </label>
                    <select
                      value={settings.syncInterval}
                      onChange={(e) => updateSyncInterval(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every hour</option>
                      <option value={180}>Every 3 hours</option>
                      <option value={360}>Every 6 hours</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Advanced Settings */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="font-medium text-gray-900">Advanced Settings</span>
                  {showAdvanced ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-4">
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <Info className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium">Conflict Resolution</p>
                        <p>When conflicts occur, Google Calendar events take precedence for now. Future versions will offer more options.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium">Sync History</p>
                        <p>Sync history is stored locally. Clear browser data will reset sync status.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sync Status */}
              {syncStatus && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Last Sync Result</h4>
                    <div className="flex items-center space-x-2">
                      {syncStatus.success ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-sm">Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">Partial</span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {settings.lastSync ? new Date(settings.lastSync).toLocaleTimeString() : ''}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center mb-4">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{syncStatus.imported}</p>
                      <p className="text-sm text-gray-600">Imported</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{syncStatus.exported}</p>
                      <p className="text-sm text-gray-600">Exported</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{syncStatus.updated}</p>
                      <p className="text-sm text-gray-600">Updated</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{syncStatus.conflicts.length}</p>
                      <p className="text-sm text-gray-600">Conflicts</p>
                    </div>
                  </div>

                  {syncStatus.conflicts.length > 0 && (
                    <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-sm font-medium text-orange-900">Conflicts Resolved:</p>
                      <ul className="text-sm text-orange-700 mt-1 space-y-1">
                        {syncStatus.conflicts.slice(0, 3).map((conflict, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-orange-600">•</span>
                            <div>
                              <span className="font-medium">{conflict.familyHubEvent.title}</span>
                              <span className="text-xs ml-2">
                                ({conflict.conflictType.replace('_', ' ')})
                              </span>
                            </div>
                          </li>
                        ))}
                        {syncStatus.conflicts.length > 3 && (
                          <li className="text-xs text-orange-600">
                            +{syncStatus.conflicts.length - 3} more conflicts resolved
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {syncStatus.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-medium text-red-900">Errors:</p>
                      <ul className="text-sm text-red-700 mt-1">
                        {syncStatus.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}

export default GoogleCalendarSync