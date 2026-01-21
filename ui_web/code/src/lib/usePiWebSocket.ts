'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface SensorState {
  lane: number
  is_blocked: boolean
}

export interface HardwareStatus {
  is_gate_down: boolean
  servo_angle: number
  sensors: SensorState[]
  timestamp_ms: number
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

interface UsePiWebSocketOptions {
  pi_url: string
  on_status?: (status: HardwareStatus) => void
  auto_reconnect?: boolean
  reconnect_interval_ms?: number
}

interface UsePiWebSocketReturn {
  status: HardwareStatus | null
  connection_state: ConnectionState
  error: string | null
  connect: () => void
  disconnect: () => void
  sendGateCommand: (is_down: boolean) => Promise<void>
  sendServoTest: (angle: number) => Promise<void>
  sendCalibration: (up_angle: number, down_angle: number) => Promise<void>
}

// How long without a message before we consider connection dead (Pi streams at 20Hz)
const STALE_TIMEOUT_MS = 2000

export function usePiWebSocket(options: UsePiWebSocketOptions): UsePiWebSocketReturn {
  const { pi_url, on_status, auto_reconnect = true, reconnect_interval_ms = 3000 } = options
  
  const [status, setStatus] = useState<HardwareStatus | null>(null)
  const [connection_state, setConnectionState] = useState<ConnectionState>('disconnected')
  const [error, setError] = useState<string | null>(null)
  
  const ws_ref = useRef<WebSocket | null>(null)
  const reconnect_timeout_ref = useRef<NodeJS.Timeout | null>(null)
  const last_message_time_ref = useRef<number>(0)
  const stale_check_interval_ref = useRef<NodeJS.Timeout | null>(null)

  const clearReconnectTimeout = useCallback(() => {
    if (reconnect_timeout_ref.current) {
      clearTimeout(reconnect_timeout_ref.current)
      reconnect_timeout_ref.current = null
    }
  }, [])

  const stopStaleCheck = useCallback(() => {
    if (stale_check_interval_ref.current) {
      clearInterval(stale_check_interval_ref.current)
      stale_check_interval_ref.current = null
    }
  }, [])

  const startStaleCheck = useCallback(() => {
    stopStaleCheck()
    last_message_time_ref.current = Date.now()
    
    stale_check_interval_ref.current = setInterval(() => {
      const elapsed = Date.now() - last_message_time_ref.current
      if (elapsed > STALE_TIMEOUT_MS && ws_ref.current) {
        console.log('[Pi WS] Connection stale - no data for', elapsed, 'ms, forcing reconnect')
        setStatus(null)
        ws_ref.current.close()
      }
    }, 500) // Check every 500ms
  }, [stopStaleCheck])

  const disconnect = useCallback(() => {
    clearReconnectTimeout()
    stopStaleCheck()
    if (ws_ref.current) {
      ws_ref.current.close()
      ws_ref.current = null
    }
    setConnectionState('disconnected')
    setStatus(null)
  }, [clearReconnectTimeout, stopStaleCheck])

  const connect = useCallback(() => {
    console.log('[Pi WS] connect() called, pi_url:', pi_url)
    
    if (!pi_url) {
      console.log('[Pi WS] No pi_url configured')
      setError('Pi URL not configured')
      setConnectionState('error')
      return
    }

    // Clean up existing connection
    if (ws_ref.current) {
      console.log('[Pi WS] Closing existing connection')
      ws_ref.current.close()
    }

    setConnectionState('connecting')
    setError(null)

    // Build WebSocket URL (handle various URL formats)
    let ws_url: string
    if (pi_url.startsWith('ws://') || pi_url.startsWith('wss://')) {
      ws_url = `${pi_url}/ws/status`
    } else if (pi_url.startsWith('http://')) {
      ws_url = `ws://${pi_url.slice(7)}/ws/status`
    } else if (pi_url.startsWith('https://')) {
      ws_url = `wss://${pi_url.slice(8)}/ws/status`
    } else {
      ws_url = `ws://${pi_url}/ws/status`
    }

    console.log('[Pi WS] Connecting to:', ws_url)

    try {
      const ws = new WebSocket(ws_url)
      ws_ref.current = ws

      ws.onopen = () => {
        console.log('[Pi WS] Connected!')
        setConnectionState('connected')
        setError(null)
        startStaleCheck()
      }

      ws.onmessage = (event) => {
        // Update last message time for stale detection
        last_message_time_ref.current = Date.now()
        
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'hardware_status' && message.data) {
            setStatus(message.data)
            on_status?.(message.data)
          }
        } catch (e) {
          console.error('[Pi WS] Parse error:', e)
        }
      }

      ws.onerror = (e) => {
        // WebSocket errors don't expose details for security, check close event
        console.error('[Pi WS] Error event (check Network tab for details)')
        setError('WebSocket error')
        setConnectionState('error')
      }

      ws.onclose = (e) => {
        // Common codes: 1000=normal, 1006=abnormal (connection failed), 1015=TLS failure
        console.log('[Pi WS] Closed - code:', e.code, 'reason:', e.reason || '(none)', 'wasClean:', e.wasClean)
        stopStaleCheck()
        setConnectionState('disconnected')
        setStatus(null)
        ws_ref.current = null

        // Auto-reconnect if enabled
        if (auto_reconnect && pi_url) {
          console.log('[Pi WS] Will reconnect in', reconnect_interval_ms, 'ms')
          reconnect_timeout_ref.current = setTimeout(() => {
            console.log('[Pi WS] Reconnecting...')
            connect()
          }, reconnect_interval_ms)
        }
      }
    } catch (e) {
      console.error('[Pi WS] Connect exception:', e)
      setError(`Failed to connect: ${e}`)
      setConnectionState('error')
    }
  }, [pi_url, on_status, auto_reconnect, reconnect_interval_ms, startStaleCheck, stopStaleCheck])

  // REST API helpers for commands
  const getBaseUrl = useCallback(() => {
    if (!pi_url) return null
    return pi_url.startsWith('http://') || pi_url.startsWith('https://')
      ? pi_url
      : `http://${pi_url}`
  }, [pi_url])

  const sendGateCommand = useCallback(async (is_down: boolean) => {
    const base = getBaseUrl()
    if (!base) throw new Error('Pi URL not configured')
    
    const response = await fetch(`${base}/gate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_down }),
    })
    if (!response.ok) throw new Error('Gate command failed')
  }, [getBaseUrl])

  const sendServoTest = useCallback(async (angle: number) => {
    const base = getBaseUrl()
    if (!base) throw new Error('Pi URL not configured')
    
    const response = await fetch(`${base}/servo/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ angle }),
    })
    if (!response.ok) throw new Error('Servo test failed')
  }, [getBaseUrl])

  const sendCalibration = useCallback(async (up_angle: number, down_angle: number) => {
    const base = getBaseUrl()
    if (!base) throw new Error('Pi URL not configured')
    
    const response = await fetch(`${base}/servo/calibration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ up_angle, down_angle }),
    })
    if (!response.ok) throw new Error('Calibration failed')
  }, [getBaseUrl])

  // Connect when pi_url changes
  useEffect(() => {
    if (pi_url) {
      connect()
    } else {
      disconnect()
    }
    
    return () => {
      disconnect()
    }
  }, [pi_url]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    connection_state,
    error,
    connect,
    disconnect,
    sendGateCommand,
    sendServoTest,
    sendCalibration,
  }
}
