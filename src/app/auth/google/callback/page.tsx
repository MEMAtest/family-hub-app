'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import googleCalendarService from '@/services/googleCalendarService'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function GoogleCalendarCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          setStatus('error')
          setMessage(`Authorization failed: ${error}`)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('No authorization code received')
          return
        }

        // Exchange code for tokens
        await googleCalendarService.exchangeCodeForTokens(code)

        setStatus('success')
        setMessage('Google Calendar connected successfully!')

        // Close the popup window and redirect parent
        if (window.opener) {
          window.opener.postMessage({ type: 'google_calendar_auth_success' }, '*')
          window.close()
        } else {
          // If not in popup, redirect to calendar
          setTimeout(() => {
            router.push('/')
          }, 2000)
        }

      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setMessage('Failed to connect Google Calendar. Please try again.')

        if (window.opener) {
          window.opener.postMessage({
            type: 'google_calendar_auth_error',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }, '*')
          window.close()
        }
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connecting Google Calendar...
              </h2>
              <p className="text-gray-600">
                Please wait while we complete the authorization.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Successful!
              </h2>
              <p className="text-gray-600">{message}</p>
              {!window.opener && (
                <p className="text-sm text-gray-500 mt-2">
                  Redirecting to calendar...
                </p>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-600">{message}</p>
              {!window.opener && (
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Return to Calendar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}