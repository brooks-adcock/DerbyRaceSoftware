'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { RaceSettings } from '@/lib/storage'

export default function ManualHeatPage() {
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [lane_cars, set_lane_cars] = useState<(string)[]>([])
  const [lane_times, set_lane_times] = useState<string[]>([])
  const [is_running, set_is_running] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(settings_data => {
      set_settings(settings_data)
      set_lane_cars(new Array(settings_data.n_tracks).fill(''))
      set_lane_times(new Array(settings_data.n_tracks).fill(''))
    })
  }, [])

  const handleGo = async () => {
    set_is_running(true)
    // For manual heats, we'll talk to /api/race later if we want to save them
    console.log('Running manual heat with cars:', lane_cars)
  }

  if (!settings) return <Container className="py-24">Loading...</Container>

  return (
    <Container className="py-24">
      <Subheading>Manual Control</Subheading>
      <Heading className="mt-2">Manual Heat</Heading>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(settings.n_tracks)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="text-sm font-bold text-gray-500 uppercase">Lane {i + 1}</div>
            <div className="mt-6">
              <label className="block text-xs font-medium text-gray-400 uppercase">Car Number</label>
              <input
                type="text"
                value={lane_cars[i]}
                onChange={(e) => {
                  const new_cars = [...lane_cars]
                  new_cars[i] = e.target.value
                  set_lane_cars(new_cars)
                }}
                className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-2xl font-bold focus:border-gray-950 focus:outline-none"
                placeholder="#"
              />
            </div>
            
            <div className="mt-8">
              <label className="block text-xs font-medium text-gray-400 uppercase">Time</label>
              <div className="mt-2 block w-full rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 font-mono text-xl text-gray-400">
                {lane_times[i] || '--.---'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Button 
          className="w-full max-w-sm py-4 text-xl" 
          onClick={handleGo}
          disabled={is_running}
        >
          {is_running ? 'Running...' : 'GO!'}
        </Button>
      </div>
    </Container>
  )
}
