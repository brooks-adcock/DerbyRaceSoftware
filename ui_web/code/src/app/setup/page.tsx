'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { RaceSettings } from '@/lib/storage'
import { usePiWebSocket, ConnectionState } from '@/lib/usePiWebSocket'
import { ChevronLeftIcon, ChevronRightIcon, SignalIcon, SignalSlashIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'

function AngleCalibrator({ label, value, onChange, onTest }: { 
  label: string
  value: number
  onChange: (val: number) => void 
  onTest: (val: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 p-6">
      <div className="text-sm font-bold text-gray-500 uppercase">{label}</div>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onChange(Math.max(0, value - 5))}
          className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <button 
          onClick={() => onChange(Math.max(0, value - 1))}
          className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <div className="text-3xl font-mono font-bold text-gray-950 w-16 text-center">
          {value}°
        </div>
        <button 
          onClick={() => onChange(Math.min(180, value + 1))}
          className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
        >
          <ChevronRightIcon className="size-4" />
        </button>
        <button 
          onClick={() => onChange(Math.min(180, value + 5))}
          className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
      <Button variant="outline" onClick={() => onTest(value)} className="text-xs">
        Test This Angle
      </Button>
    </div>
  )
}

function ConnectionIndicator({ state, error }: { state: ConnectionState; error: string | null }) {
  const colors = {
    disconnected: 'bg-gray-400',
    connecting: 'bg-yellow-400 animate-pulse',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  }
  
  const labels = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    error: error || 'Error',
  }
  
  return (
    <div className="flex items-center gap-2">
      {state === 'connected' ? (
        <SignalIcon className="size-5 text-green-500" />
      ) : (
        <SignalSlashIcon className="size-5 text-gray-400" />
      )}
      <div className={clsx('size-2 rounded-full', colors[state])} />
      <span className="text-sm text-gray-600">{labels[state]}</span>
    </div>
  )
}

export default function SetupPage() {
  const [settings, setSettings] = useState<RaceSettings | null>(null)
  const [up_angle, setUpAngle] = useState(60)
  const [down_angle, setDownAngle] = useState(0)
  const [calibration_loaded, setCalibrationLoaded] = useState(false)

  // Load settings on mount
  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(setSettings)
  }, [])

  // Pi WebSocket connection
  const pi = usePiWebSocket({ pi_url: settings?.pi_url || '' })

  // Fetch Pi's actual calibration when connected
  useEffect(() => {
    if (pi.connection_state === 'connected' && settings?.pi_url && !calibration_loaded) {
      const base_url = settings.pi_url.startsWith('http') 
        ? settings.pi_url 
        : `http://${settings.pi_url}`
      
      fetch(`${base_url}/servo/calibration`)
        .then(res => res.json())
        .then(data => {
          console.log('Loaded Pi calibration:', data)
          setUpAngle(data.up_angle)
          setDownAngle(data.down_angle)
          setCalibrationLoaded(true)
        })
        .catch(e => console.error('Failed to load calibration:', e))
    }
  }, [pi.connection_state, settings?.pi_url, calibration_loaded])

  const handleSaveSettings = async (updates: Partial<RaceSettings>) => {
    if (!settings) return
    const new_settings = { ...settings, ...updates }
    setSettings(new_settings)
    await fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(new_settings),
    })
  }

  const handleGateToggle = async () => {
    if (!pi.status) return
    try {
      await pi.sendGateCommand(!pi.status.is_gate_down)
    } catch (e) {
      console.error('Gate command failed:', e)
    }
  }

  const handleServoTest = async (angle: number) => {
    try {
      await pi.sendServoTest(angle)
    } catch (e) {
      console.error('Servo test failed:', e)
    }
  }

  const handleSaveCalibration = async () => {
    try {
      await pi.sendCalibration(up_angle, down_angle)
      // Also save to local settings
      await handleSaveSettings({
        gate_up_val: up_angle / 120,
        gate_down_val: down_angle / 120,
      })
      alert('Calibration saved!')
    } catch (e) {
      console.error('Calibration failed:', e)
      alert('Failed to save calibration')
    }
  }

  if (!settings) return <Container className="py-24">Loading settings...</Container>

  return (
    <Container className="py-24">
      <Subheading>Configuration</Subheading>
      <Heading className="mt-2">Race Setup</Heading>

      {/* Pi Connection Settings */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-950">Pi Hardware Controller</h3>
            <p className="text-xs text-gray-500 mt-1">Connect to the Raspberry Pi running the track controller</p>
          </div>
          <ConnectionIndicator state={pi.connection_state} error={pi.error} />
        </div>
        <div className="mt-4 flex gap-4">
          <input
            type="text"
            value={settings.pi_url}
            onChange={(e) => handleSaveSettings({ pi_url: e.target.value })}
            placeholder="192.168.1.100:8000"
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
          />
          {pi.connection_state === 'connected' ? (
            <Button variant="outline" onClick={pi.disconnect}>Disconnect</Button>
          ) : (
            <Button onClick={pi.connect} disabled={!settings.pi_url}>Connect</Button>
          )}
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Left Column: Gate & Calibration */}
        <section className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-950">Number of Tracks</label>
            <input
              type="number"
              value={settings.n_tracks}
              onChange={(e) => handleSaveSettings({ n_tracks: parseInt(e.target.value) })}
              className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
            />
          </div>

          {/* Live Gate Status */}
          <div className="rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Gate Control</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={clsx(
                    'size-3 rounded-full',
                    pi.status?.is_gate_down ? 'bg-green-500' : 'bg-amber-500'
                  )} />
                  <span className="text-sm text-gray-600">
                    {pi.status ? (pi.status.is_gate_down ? 'DOWN (Open)' : 'UP (Holding)') : 'Unknown'}
                  </span>
                </div>
              </div>
              <Button 
                onClick={handleGateToggle} 
                disabled={pi.connection_state !== 'connected'}
              >
                Toggle Gate
              </Button>
            </div>
            
            {/* Live Servo Angle */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Current Servo Angle</span>
                <span className="text-2xl font-mono font-bold text-gray-950">
                  {pi.status?.servo_angle ?? '—'}°
                </span>
              </div>
              {/* Visual angle indicator */}
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-100"
                  style={{ width: `${((pi.status?.servo_angle ?? 0) / 120) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Servo Calibration */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-950">Servo Calibration</h3>
            <div className="grid grid-cols-2 gap-4">
              <AngleCalibrator 
                label="Gate Up (Hold)" 
                value={up_angle} 
                onChange={setUpAngle}
                onTest={handleServoTest}
              />
              <AngleCalibrator 
                label="Gate Down (Release)" 
                value={down_angle} 
                onChange={setDownAngle}
                onTest={handleServoTest}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleSaveCalibration}
              disabled={pi.connection_state !== 'connected'}
            >
              Save Calibration to Pi
            </Button>
          </div>
        </section>

        {/* Right Column: Live Sensors */}
        <section className="rounded-2xl bg-gray-50 p-8">
          <div className="flex items-center justify-between">
            <div>
              <Subheading>Live Hardware Status</Subheading>
              <h3 className="mt-2 text-xl font-bold text-gray-950">Track Sensors</h3>
            </div>
            {pi.status && (
              <span className="text-xs text-gray-400 font-mono">
                {new Date(pi.status.timestamp_ms).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="mt-8 space-y-4">
            {pi.status?.sensors?.map((sensor) => (
              <div 
                key={sensor.lane} 
                className={clsx(
                  'flex items-center justify-between rounded-lg p-4 shadow-sm transition-colors duration-100',
                  sensor.is_blocked ? 'bg-red-50 border border-red-200' : 'bg-white'
                )}
              >
                <div className="font-medium text-gray-950">Lane {sensor.lane}</div>
                <div className={clsx(
                  'flex items-center gap-2 text-sm font-bold',
                  sensor.is_blocked ? 'text-red-600' : 'text-green-600'
                )}>
                  <div className={clsx(
                    'size-3 rounded-full transition-colors duration-100',
                    sensor.is_blocked ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                  )} />
                  {sensor.is_blocked ? 'BLOCKED' : 'Clear'}
                </div>
              </div>
            )) || (
              // Placeholder when no data
              Array.from({ length: settings.n_tracks }, (_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm opacity-50">
                  <div className="font-medium text-gray-950">Lane {i + 1}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="size-3 rounded-full bg-gray-300" />
                    No Data
                  </div>
                </div>
              ))
            )}
          </div>
          
          {pi.connection_state !== 'connected' && (
            <div className="mt-8 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <p className="font-medium">Not connected to Pi</p>
              <p className="mt-1 text-amber-600">Enter the Pi URL above and click Connect to see live sensor data.</p>
            </div>
          )}
        </section>
      </div>
    </Container>
  )
}
