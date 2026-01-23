'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Breadcrumb } from '@/components/breadcrumb'
import { CountdownOverlay } from '@/components/countdown-overlay'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { RaceSettings, Race, Car } from '@/lib/storage'

// Heat control state machine: idle -> ready -> racing -> idle
type HeatState = 'idle' | 'ready' | 'racing'

export default function HeatsPage() {
  const [race, set_race] = useState<Race | null>(null)
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [cars, set_cars] = useState<Car[]>([])
  const [is_loading, set_is_loading] = useState(true)
  const [heat_state, set_heat_state] = useState<HeatState>('idle')
  const [countdown_end, set_countdown_end] = useState<number | null>(null)
  const [is_generate_modal_open, set_is_generate_modal_open] = useState(false)
  const [selected_divisions, set_selected_divisions] = useState<string[]>([])

  const fetchData = async () => {
    const [race_data, settings_data, cars_data] = await Promise.all([
      fetch('/api/race').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/cars').then(res => res.json())
    ])
    set_race(race_data)
    set_settings(settings_data)
    set_cars(cars_data)
    set_is_loading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  const openGenerateModal = () => {
    // Pre-select all divisions
    set_selected_divisions(settings?.divisions || [])
    set_is_generate_modal_open(true)
  }

  const toggleDivision = (division: string) => {
    set_selected_divisions(prev => 
      prev.includes(division) 
        ? prev.filter(d => d !== division)
        : [...prev, division]
    )
  }

  const selectAllDivisions = () => set_selected_divisions(settings?.divisions || [])
  const deselectAllDivisions = () => set_selected_divisions([])

  const getActiveCarsInDivision = (division: string) => 
    cars.filter(c => c.division === division && (c.registration_status === 'REGISTERED' || c.registration_status === 'COURTESY')).length

  const handleGenerateHeats = async () => {
    const response = await fetch('/api/race', {
      method: 'POST',
      body: JSON.stringify({ action: 'generate_heats', divisions: selected_divisions }),
    })
    const data = await response.json()
    set_race(data)
    set_heat_state('idle')
    set_is_generate_modal_open(false)
  }

  // Step 1: Ready Heat - raise the gate
  const handleReadyHeat = async () => {
    await fetch('/api/race', {
      method: 'POST',
      body: JSON.stringify({ action: 'raise_gate' }),
    })
    set_heat_state('ready')
  }

  // Step 2: Drop Gate - countdown then start the race
  const handleDropGate = async () => {
    if (!race || race.current_heat_id === null) return
    
    // Clear existing times for rerun
    const current_heat = race.heats.find(h => h.id === race.current_heat_id)
    if (current_heat) {
      for (const lane of current_heat.lanes) {
        if (lane.car_id !== null) {
          lane.time = null
        }
      }
    }
    
    set_heat_state('racing')
    
    // Start countdown (3 seconds) - use local state so polling doesn't overwrite it
    const countdown_ms = 3000
    set_countdown_end(Date.now() + countdown_ms)
    
    // Wait for countdown to complete, THEN drop gate
    await new Promise(resolve => setTimeout(resolve, countdown_ms))
    set_countdown_end(null)
    
    // Now trigger the gate drop and race
    const response = await fetch('/api/race', {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'trigger_gate',
        heat_id: race.current_heat_id
      }),
    })
    const data = await response.json()
    set_race(data)
  }

  // After race: go to next heat
  const handleNextHeat = async () => {
    if (race && race.current_heat_id !== null) {
      const current_idx = race.heats.findIndex(h => h.id === race.current_heat_id)
      if (current_idx < race.heats.length - 1) {
        const next_heat = race.heats[current_idx + 1]
        const response = await fetch('/api/race', {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'update_current_heat',
            heat_id: next_heat.id
          }),
        })
        const data = await response.json()
        set_race(data)
      }
    }
    set_heat_state('idle')
  }

  // After race: rerun current heat (clear times first)
  const handleRerunHeat = async () => {
    if (!race || race.current_heat_id === null) return
    
    const response = await fetch('/api/race', {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'clear_heat_times',
        heat_id: race.current_heat_id
      }),
    })
    const data = await response.json()
    set_race(data)
    set_heat_state('idle')
  }

  const handleCompleteRace = async () => {
    const response = await fetch('/api/race', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_state', state: 'COMPLETE' }),
    })
    const data = await response.json()
    set_race(data)
  }

  const submitTime = async (lane_index: number, time: number) => {
    if (!race || race.current_heat_id === null) return
    const response = await fetch('/api/race', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_heat_time',
        heat_id: race.current_heat_id,
        lane_index,
        time
      }),
    })
    const data = await response.json()
    set_race(data)
  }

  if (is_loading || !settings || !race) return <Container className="py-24">Loading...</Container>

  const heats = race.heats || []
  const current_heat_index = race.current_heat_id !== null 
    ? heats.findIndex(h => h.id === race.current_heat_id) 
    : 0
  const current_heat = heats.length > 0 ? heats[current_heat_index] : null
  const is_current_heat_finished = current_heat && current_heat.lanes.every((lane) => lane.car_id === null || lane.time !== null)
  const is_last_heat = current_heat_index === heats.length - 1

  return (
    <Container className="py-24">
      <CountdownOverlay countdown_end={countdown_end} />
      <Breadcrumb />
      <div className="flex items-end justify-between">
        <div>
          <Subheading>Race Control</Subheading>
          <Heading className="mt-2">Heat Administration</Heading>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" href="/manual-heat">Manual Heat</Button>
          <Button onClick={openGenerateModal}>Generate Heats</Button>
        </div>
      </div>

      {race.state === 'COMPLETE' ? (
        <div className="mt-12 rounded-3xl bg-green-50 border-2 border-green-200 p-12 text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="text-3xl font-bold text-green-800">Race Complete!</h2>
          <p className="mt-4 text-xl text-green-700">{heats.length} heats finished</p>
          <div className="mt-8">
            <Button href="/results">View Results</Button>
          </div>
        </div>
      ) : heats.length === 0 ? (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500">No heats generated yet. Click "Generate Heats" to begin.</p>
        </div>
      ) : (
        <div className="mt-12 space-y-12">
          {/* Current Heat Focus */}
          {current_heat && (
            <section className="rounded-3xl bg-gray-950 p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase">
                    {heat_state === 'idle' && 'Prepare Heat'}
                    {heat_state === 'ready' && 'Gate Up - Ready'}
                    {heat_state === 'racing' && 'Race Complete'}
                  </div>
                  <h2 className="text-3xl font-bold">Heat #{current_heat.id}</h2>
                </div>
                {/* Top-right complete button only when finished and on last heat */}
                {heat_state === 'racing' && is_current_heat_finished && is_last_heat && (
                  <Button onClick={handleCompleteRace}>
                    Complete Race
                  </Button>
                )}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {current_heat.lanes.map((lane, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="text-xs font-medium text-gray-400 uppercase">Lane {i + 1}</div>
                    <div className="mt-2 text-2xl font-bold">
                      {lane.car_id ? `Car #${lane.car_id}` : 'Empty'}
                    </div>
                    <div className="mt-4 font-mono text-4xl text-blue-400">
                      {lane.time && !countdown_end ? lane.time?.toFixed(3) : '--.---'}
                    </div>
                    {lane.car_id && !lane.time && heat_state === 'racing' && (
                      <div className="mt-4 flex gap-2">
                        <input 
                          type="number" 
                          step="0.001" 
                          placeholder="Manual time"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              submitTime(i, parseFloat((e.target as HTMLInputElement).value))
                            }
                          }}
                          className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Control Buttons - State Machine */}
              <div className="mt-10 border-t border-white/10 pt-8">
                {heat_state === 'idle' && (
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleReadyHeat}
                      className="px-16 py-3 text-lg !bg-yellow-500 !text-gray-900 hover:!bg-yellow-400 border-none shadow-lg"
                    >
                      Ready Heat
                    </Button>
                  </div>
                )}

                {heat_state === 'ready' && (
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleDropGate}
                      className="px-16 py-3 text-lg !bg-green-500 !text-white hover:!bg-green-400 border-none shadow-lg animate-pulse"
                    >
                      Drop Gate
                    </Button>
                  </div>
                )}

                {heat_state === 'racing' && (
                  <div className="flex justify-between gap-4">
                    <Button 
                      onClick={handleRerunHeat}
                      variant="outline"
                      className="px-8 py-3 !border-red-500 !text-red-400 hover:!bg-red-500/10"
                    >
                      Rerun Heat
                    </Button>
                    {!is_last_heat && (
                      <Button 
                        onClick={handleNextHeat}
                        disabled={!is_current_heat_finished}
                        className="px-8 py-3 !bg-blue-600 !text-white hover:!bg-blue-500 border-none disabled:opacity-50"
                      >
                        Next Heat
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Heats Table */}
          <section>
            <h3 className="text-lg font-bold text-gray-950">Upcoming Heats</h3>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-4 pr-4 font-medium">Heat</th>
                    {[...Array(settings.n_tracks)].map((_, i) => (
                      <th key={i} className="pb-4 pr-4 font-medium">Lane {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {heats.map((heat, idx) => (
                    <tr key={heat.id} className={`group ${idx === current_heat_index ? 'bg-yellow-50' : ''}`}>
                      <td className="py-4 pr-4 font-bold">#{heat.id}</td>
                      {heat.lanes.map((lane, i) => (
                        <td key={i} className="py-4 pr-4">
                          <div className="text-gray-950">{lane.car_id ? `#${lane.car_id}` : '-'}</div>
                          <div className="text-xs text-gray-400">
                            {lane.time ? `${lane.time?.toFixed(3)}s` : '--.---'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Generate Heats Modal */}
      <Dialog open={is_generate_modal_open} onClose={() => set_is_generate_modal_open(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-lg w-full rounded-2xl bg-white p-8 shadow-2xl">
            <DialogTitle className="text-xl font-bold text-gray-950">Select Divisions for Heat Generation</DialogTitle>
            <p className="mt-2 text-sm text-gray-500">Choose which divisions to include in the heat schedule.</p>
            
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={selectAllDivisions} className="text-xs">Select All</Button>
              <Button variant="outline" onClick={deselectAllDivisions} className="text-xs">Deselect All</Button>
            </div>
            
            <div className="mt-6 space-y-2 max-h-80 overflow-y-auto">
              {(settings?.divisions || []).map((division) => {
                const car_count = getActiveCarsInDivision(division)
                return (
                  <label key={division} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected_divisions.includes(division)}
                        onChange={() => toggleDivision(division)}
                        className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                      />
                      <span className="font-medium text-gray-950">{division}</span>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {car_count} car{car_count !== 1 ? 's' : ''}
                    </span>
                  </label>
                )
              })}
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => set_is_generate_modal_open(false)}>Cancel</Button>
              <Button 
                onClick={handleGenerateHeats}
                disabled={selected_divisions.length === 0}
              >
                Generate Heats
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Container>
  )
}
