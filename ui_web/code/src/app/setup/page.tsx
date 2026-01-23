'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Breadcrumb } from '@/components/breadcrumb'
import type { RaceSettings } from '@/lib/storage'
import { ALGORITHM_DISPLAY_NAMES } from '@/lib/heatAlgorithms'
import type { HeatAlgorithmKey } from '@/lib/heatAlgorithms'
import { usePiWebSocket, ConnectionState } from '@/lib/usePiWebSocket'
import { ChevronLeftIcon, ChevronRightIcon, SignalIcon, SignalSlashIcon, TrashIcon, PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import clsx from 'clsx'
import type { Car } from '@/lib/storage'

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
  const [cars, setCars] = useState<Car[]>([])
  const [new_division, setNewDivision] = useState('')
  const [is_adding_division, setIsAddingDivision] = useState(false)
  const [delete_modal, setDeleteModal] = useState<{ division: string; reassign_to: string } | null>(null)

  // Load settings and cars on mount
  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(setSettings)
    fetch('/api/cars').then(res => res.json()).then(setCars)
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

  const handleAddDivision = async () => {
    if (!settings || !new_division.trim()) return
    const updated_divisions = [...(settings.divisions || []), new_division.trim()]
    await handleSaveSettings({ divisions: updated_divisions })
    setNewDivision('')
    setIsAddingDivision(false)
  }

  const handleDeleteDivision = (division: string) => {
    if (!settings) return
    const cars_in_division = cars.filter(c => c.division === division)
    if (cars_in_division.length > 0) {
      const other_divisions = (settings.divisions || []).filter(d => d !== division)
      setDeleteModal({ division, reassign_to: other_divisions[0] || '' })
    } else {
      confirmDeleteDivision(division)
    }
  }

  const confirmDeleteDivision = async (division: string, reassign_to?: string) => {
    if (!settings) return
    
    // Reassign cars if needed
    if (reassign_to) {
      const updated_cars = cars.map(c => 
        c.division === division ? { ...c, division: reassign_to } : c
      )
      for (const car of updated_cars.filter(c => c.division === reassign_to && cars.find(orig => orig.id === c.id)?.division === division)) {
        await fetch(`/api/cars/${car.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ division: reassign_to }),
        })
      }
      setCars(updated_cars)
    }
    
    // Remove division from settings
    const updated_divisions = (settings.divisions || []).filter(d => d !== division)
    await handleSaveSettings({ divisions: updated_divisions })
    setDeleteModal(null)
  }

  const getCarsInDivision = (division: string) => cars.filter(c => c.division === division).length

  if (!settings) return <Container className="py-24">Loading settings...</Container>

  return (
    <Container className="py-24">
      <Breadcrumb />
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

          <div>
            <label className="block text-sm font-medium text-gray-950">Heat Generation Algorithm</label>
            <select
              value={settings.heat_algorithm || 'rotation'}
              onChange={(e) => handleSaveSettings({ heat_algorithm: e.target.value as HeatAlgorithmKey })}
              className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
            >
              {(Object.keys(ALGORITHM_DISPLAY_NAMES) as HeatAlgorithmKey[]).map((key) => (
                <option key={key} value={key}>
                  {ALGORITHM_DISPLAY_NAMES[key]}
                </option>
              ))}
            </select>
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

      {/* Divisions Management */}
      <section className="mt-12">
        <Subheading>Race Categories</Subheading>
        <h3 className="mt-2 text-xl font-bold text-gray-950">Divisions</h3>
        <p className="mt-1 text-sm text-gray-500">Manage the divisions available for car registration.</p>
        
        <div className="mt-6 space-y-2">
          {(settings.divisions || []).map((division) => {
            const car_count = getCarsInDivision(division)
            return (
              <div key={division} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-950">{division}</span>
                  {car_count > 0 && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {car_count} car{car_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteDivision(division)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            )
          })}
          
          {is_adding_division ? (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2">
              <input
                type="text"
                value={new_division}
                onChange={(e) => setNewDivision(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDivision()}
                placeholder="New division name..."
                autoFocus
                className="flex-1 text-sm text-gray-950 focus:outline-none"
              />
              <Button onClick={handleAddDivision} disabled={!new_division.trim()}>Add</Button>
              <Button variant="outline" onClick={() => { setIsAddingDivision(false); setNewDivision('') }}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingDivision(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-4 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              <PlusIcon className="size-4" />
              Add Division
            </button>
          )}
        </div>
      </section>

      {/* Delete Division Modal */}
      <Dialog open={delete_modal !== null} onClose={() => setDeleteModal(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <ExclamationTriangleIcon className="size-6 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-950">Reassign Cars</DialogTitle>
                <p className="mt-2 text-sm text-gray-500">
                  There are cars in the <span className="font-medium text-gray-950">{delete_modal?.division}</span> division. 
                  Choose a division to reassign them to before deleting.
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-950">Reassign to</label>
              <select
                value={delete_modal?.reassign_to || ''}
                onChange={(e) => setDeleteModal(prev => prev ? { ...prev, reassign_to: e.target.value } : null)}
                className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
              >
                {(settings.divisions || []).filter(d => d !== delete_modal?.division).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
              <Button 
                onClick={() => delete_modal && confirmDeleteDivision(delete_modal.division, delete_modal.reassign_to)}
                disabled={!delete_modal?.reassign_to}
              >
                Reassign & Delete
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Container>
  )
}
