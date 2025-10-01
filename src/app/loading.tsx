'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function Loading() {
  const [showTimeout, setShowTimeout] = useState(false)

  useEffect(() => {
    // Show timeout message after 15 seconds
    const timer = setTimeout(() => {
      setShowTimeout(true)
    }, 15000)

    return () => clearTimeout(timer)
  }, [])

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Loading Family Hub...</p>

        {showTimeout && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm mb-3">
              Taking longer than expected. This might be due to:
            </p>
            <ul className="text-yellow-700 text-xs list-disc list-inside text-left mb-4 space-y-1">
              <li>Slow internet connection</li>
              <li>Server startup delay</li>
              <li>Database initialization</li>
            </ul>
            <button
              onClick={handleReload}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        )}
      </div>
    </div>
  )
}