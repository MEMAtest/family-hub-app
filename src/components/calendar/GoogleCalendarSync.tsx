'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  RefreshCw,
  Check,
  AlertTriangle,
  Upload,
  Zap,
  Shield,
  Globe,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import { CalendarEvent } from '@/types/calendar.types'
import { useFamilyStore } from '@/store/familyStore'

interface GoogleCalendarInfo {
  id: string
  summary: string
  description?: string
  primary: boolean
  accessRole?: string
  backgroundColor?: string
}

interface GoogleCalendarSettings {
  enabled: boolean
  selectedCalendars: string[]
  syncDirection: 'export'
  autoSync: boolean
  syncInterval: number
  lastSync?: Date
}

interface SyncResult {
  success: boolean
  imported: number
  exported: number
  updated: number
  errors: string[]
  conflicts: Array<{ familyHubEvent: CalendarEvent; conflictType: string }>
}

interface GoogleCalendarSyncProps {
  events?: CalendarEvent[]
  onSyncComplete?: (result: SyncResult) => void
}

const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({
  onSyncComplete
}) => {
  const storeFamilyId = useFamilyStore((state) => state.databaseStatus.familyId)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([])
  const [settings, setSettings] = useState<GoogleCalendarSettings>({
    enabled: false,
    selectedCalendars: [],
    syncDirection: 'export',
    autoSync: false,
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

  const familyId = storeFamilyId || (typeof window !== 'undefined' ? localStorage.getItem('familyId') || '' : '')

  useEffect(() => {
    if (!familyId) return
    void checkAuthStatus()
  }, [familyId])

  const checkAuthStatus = async () => {
    if (!familyId) return
    try {
      const response = await fetch(`/api/families/${familyId}/google-calendar`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to load Google Calendar status')
      setIsAuthenticated(Boolean(payload.connected))
      setCalendars(payload.calendars || [])
      if (payload.connection) {
        setSettings((prev) => ({
          ...prev,
          enabled: Boolean(payload.connected),
          selectedCalendars: payload.connection.selectedCalendarId ? [payload.connection.selectedCalendarId] : [],
          syncDirection: 'export',
          lastSync: payload.connection.lastExportAt ? new Date(payload.connection.lastExportAt) : undefined,
        }))
      }
    } catch (error) {
      console.error('Failed to load Google Calendar status:', error)
      setError(error instanceof Error ? error.message : 'Failed to load Google Calendar status')
    }
  }

  const saveSettings = (newSettings: GoogleCalendarSettings) => {
    setSettings(newSettings)
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setError(null)

      if (!familyId) throw new Error('Family is not loaded yet')
      const response = await fetch(`/api/families/${familyId}/google-calendar/connect`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to start Google Calendar connection')
      const authUrl = payload.authUrl

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
          void checkAuthStatus()
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
            void checkAuthStatus()
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
      if (!familyId) throw new Error('Family is not loaded yet')
      await fetch(`/api/families/${familyId}/google-calendar`, { method: 'DELETE' })
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

      // Phase 2: Preparing export data
      setSyncProgress({
        phase: 'Fetching',
        progress: 30,
        message: 'Preparing Family Hub events for export...'
      })

      // Phase 3: Conflict detection
      setSyncProgress({
        phase: 'Analysis',
        progress: 50,
        message: 'Checking which events already have Google links...'
      })

      // Phase 4: Sync operation
      setSyncProgress({
        phase: 'Syncing',
        progress: 70,
        message: 'Exporting events to Google Calendar...'
      })

      if (!familyId) throw new Error('Family is not loaded yet')
      const response = await fetch(`/api/families/${familyId}/google-calendar/export`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0] || result.error || 'Google Calendar export failed')

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
        message: `Export completed! ${result.exported} exported, ${result.updated} updated`
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
    const newSelected = settings.selectedCalendars.includes(calendarId) ? [] : [calendarId]
    const selectedCalendar = calendars.find((calendar) => calendar.id === calendarId)

    saveSettings({
      ...settings,
      selectedCalendars: newSelected,
      enabled: newSelected.length > 0
    })
    if (familyId) {
      void fetch(`/api/families/${familyId}/google-calendar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedCalendarId: newSelected[0] || null,
          selectedCalendarName: selectedCalendar?.summary || null,
        }),
      })
    }
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
          <p className="text-sm text-gray-600">Export Family Hub events to Google Calendar</p>
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
                Export your Family Hub events to Google Calendar so they appear across your devices.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Secure OAuth 2.0 authentication</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Export-only sync avoids duplicate imports</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>Choose the Google calendar to receive events</span>
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
                        : 'Ready to export'
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
                        Exporting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Export Now
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
                <h4 className="font-medium text-gray-900 mb-3">Select Google Calendar</h4>
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
                        <p className="font-medium">Export-only v1</p>
                        <p>Family Hub sends events to Google Calendar. Google events are not imported back into Family Hub yet.</p>
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
