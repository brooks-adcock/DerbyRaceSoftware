'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'

interface HealthCheck {
  id: string
  label: string
  is_ok: boolean
  message: string
  help_url?: string
}

interface HealthStatus {
  is_healthy: boolean
  checks: HealthCheck[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888'

export function SetupChecklist({ force_show = false }: { force_show?: boolean } = {}) {
  const [status, setStatus] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [is_loading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const response = await fetch(`${API_URL}/v1/health`)
        if (!response.ok) {
          throw new Error('Failed to fetch health status')
        }
        const data = await response.json()
        setStatus(data)
        setError(null)
      } catch (e) {
        setError('Cannot connect to API server')
        setStatus(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHealth()
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  // Loading state
  if (is_loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-5 w-5 rounded-full bg-gray-300" />
          <div className="h-4 w-48 rounded bg-gray-300" />
        </div>
      </div>
    )
  }

  // Don't show anything if healthy (unless forced)
  if (status?.is_healthy && !force_show) {
    return null
  }

  // Success state if healthy
  if (status?.is_healthy) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-800">
              All systems go!
            </h3>
            <p className="text-sm text-green-700 mt-1">
              API and all services are running correctly.
            </p>
            
            <ul className="mt-3 space-y-2 border-t border-green-100 pt-3">
              {status.checks.map((check) => (
                <li key={check.id} className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-green-700">
                    {check.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800">
            Setup Required
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            Complete the following to get started:
          </p>
          
          <ul className="mt-3 space-y-2">
            {error ? (
              <li className="flex items-center gap-2">
                <XCircleIcon className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-sm text-gray-700">{error}</span>
              </li>
            ) : (
              status?.checks.map((check) => (
                <li key={check.id} className="flex items-start gap-2">
                  {check.is_ok ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className={clsx(
                      'text-sm',
                      check.is_ok ? 'text-gray-600' : 'text-gray-800 font-medium'
                    )}>
                      {check.label}
                    </span>
                    {!check.is_ok && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {check.message}
                      </p>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
          
          {status?.checks.some(c => !c.is_ok && (c.id === 'gemini_key' || c.message.includes('GEMINI'))) && (
            <p className="text-xs text-amber-600 mt-3">
              See <code className="bg-amber-100 px-1 rounded">.helper/gemini_setup.md</code> for setup instructions.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

