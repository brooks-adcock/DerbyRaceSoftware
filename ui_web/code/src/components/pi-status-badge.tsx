'use client'

import { useState, useEffect } from 'react'
import { usePiWebSocket } from '@/lib/usePiWebSocket'
import { SignalIcon, SignalSlashIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'

export function PiStatusBadge() {
  const [pi_url, set_pi_url] = useState<string>('')

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => set_pi_url(data.pi_url || ''))
      .catch(() => {})
  }, [])

  const pi = usePiWebSocket({ pi_url })

  const is_connected = pi.connection_state === 'connected'
  const is_connecting = pi.connection_state === 'connecting'

  return (
    <div
      className={clsx(
        'fixed right-4 top-4 z-40 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wide shadow-md ring-1',
        is_connected
          ? 'bg-green-50 text-green-700 ring-green-200'
          : is_connecting
            ? 'bg-yellow-50 text-yellow-700 ring-yellow-200 animate-pulse'
            : 'bg-red-50 text-red-700 ring-red-200'
      )}
      title={pi.error || pi.connection_state}
    >
      {is_connected ? (
        <SignalIcon className="size-4" />
      ) : (
        <SignalSlashIcon className="size-4" />
      )}
      <span className="hidden sm:inline">
        {is_connected ? 'Pi Online' : is_connecting ? 'Connecting...' : 'Pi Offline'}
      </span>
    </div>
  )
}
