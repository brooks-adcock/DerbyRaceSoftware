'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { RaceSettings } from '@/lib/storage'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'

function Calibrator({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 p-6">
      <div className="text-sm font-bold text-gray-500 uppercase">{label}</div>
      <div className="flex items-center gap-6">
        <button 
          onClick={() => onChange(Math.max(0, value - 0.01))}
          className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
        >
          <ChevronLeftIcon className="size-6" />
        </button>
        <div className="text-3xl font-mono font-bold text-gray-950">
          {value.toFixed(2)}
        </div>
        <button 
          onClick={() => onChange(Math.min(1, value + 0.01))}
          className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
        >
          <ChevronRightIcon className="size-6" />
        </button>
      </div>
    </div>
  )
}

export default function SetupPage() {
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [sensors, set_sensors] = useState<{ id: number, status: string }[]>([])
  const [gate_state, set_gate_state] = useState<'Up' | 'Down'>('Up')

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(set_settings)
    fetch('/api/hardware?action=sensors').then(res => res.json()).then(data => set_sensors(data.sensors))
  }, [])

  const handleSaveSettings = async (updates: Partial<RaceSettings>) => {
    if (!settings) return
    const new_settings = { ...settings, ...updates }
    set_settings(new_settings)
    await fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(new_settings),
    })
  }

  const handleGateTest = async () => {
    set_gate_state(gate_state === 'Up' ? 'Down' : 'Up')
    await fetch('/api/hardware?action=gate_test')
  }

  const handleCalibrate = async () => {
    if (!settings) return
    await fetch('/api/hardware', {
      method: 'POST',
      body: JSON.stringify({
        action: 'calibrate',
        up: settings.gate_up_val,
        down: settings.gate_down_val
      })
    })
    alert('Calibrated!')
  }

  if (!settings) return <Container className="py-24">Loading settings...</Container>

  return (
    <Container className="py-24">
      <Subheading>Configuration</Subheading>
      <Heading className="mt-2">Race Setup</Heading>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
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

          <div className="rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Gate Control</h3>
                <p className="text-xs text-gray-500">Current state: {gate_state}</p>
              </div>
              <Button onClick={handleGateTest}>Toggle Gate</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Calibrator 
              label="Gate Up" 
              value={settings.gate_up_val} 
              onChange={(val) => handleSaveSettings({ gate_up_val: val })}
            />
            <Calibrator 
              label="Gate Down" 
              value={settings.gate_down_val} 
              onChange={(val) => handleSaveSettings({ gate_down_val: val })}
            />
          </div>
          <Button className="w-full" variant="outline" onClick={handleCalibrate}>Send Calibration</Button>
        </section>

        <section className="rounded-2xl bg-gray-50 p-8">
          <Subheading>Hardware Status</Subheading>
          <h3 className="mt-2 text-xl font-bold text-gray-950">Track Sensors</h3>
          
          <div className="mt-8 space-y-4">
            {sensors.map((sensor) => (
              <div key={sensor.id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
                <div className="font-medium text-gray-950">Track #{sensor.id}</div>
                <div className={`flex items-center gap-2 text-sm font-bold ${
                  sensor.status === 'Open' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <div className={`size-2 rounded-full ${sensor.status === 'Open' ? 'bg-green-600' : 'bg-red-600'}`} />
                  {sensor.status}
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            className="mt-8 w-full" 
            variant="outline"
            onClick={() => fetch('/api/hardware?action=sensors').then(res => res.json()).then(data => set_sensors(data.sensors))}
          >
            Refresh Status
          </Button>
        </section>
      </div>
    </Container>
  )
}
