'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Breadcrumb } from '@/components/breadcrumb'
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
    
    try {
      const response = await fetch('/api/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_manual_heat',
          lane_cars,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to run manual heat:', error)
        alert(`Error: ${error.error || 'Failed to run heat'}`)
        set_is_running(false)
        return
      }
      
      const data = await response.json()
      
      // Update lane times in UI
      const new_times = [...lane_times]
      for (let i = 0; i < data.lane_times.length; i++) {
        if (data.lane_times[i] !== null) {
          new_times[i] = data.lane_times[i].toFixed(3)
        }
      }
      set_lane_times(new_times)
      
    } catch (error) {
      console.error('Error running manual heat:', error)
      alert('Failed to run manual heat. Please try again.')
    } finally {
      set_is_running(false)
    }
  }

  if (!settings) return <Container className="py-24">Loading...</Container>

  return (
    <Container className="py-24">
      <Breadcrumb />
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
                {lane_times[i] ? lane_times[i] : '--.---'}
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
