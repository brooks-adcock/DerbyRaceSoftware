'use client'

import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

export function CountdownOverlay({ countdown_end, onComplete }: { countdown_end: number | null, onComplete?: () => void }) {
  const [remaining, set_remaining] = useState<number | null>(null)

  useEffect(() => {
    if (!countdown_end) {
      set_remaining(null)
      return
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const diff = Math.max(0, Math.ceil((countdown_end - now) / 1000))
      
      if (diff === 0) {
        set_remaining(null)
        onComplete?.()
        clearInterval(interval)
      } else {
        set_remaining(diff)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [countdown_end, onComplete])

  if (remaining === null) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300">
      <div className={clsx(
        "text-[20rem] font-black italic tracking-tighter text-white animate-pulse transform scale-150",
        remaining === 3 ? "text-red-500" : remaining === 2 ? "text-yellow-500" : "text-green-500"
      )}>
        {remaining}
      </div>
    </div>
  )
}
