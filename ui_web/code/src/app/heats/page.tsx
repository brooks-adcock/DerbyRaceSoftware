'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { CountdownOverlay } from '@/components/countdown-overlay'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { Heat, RaceSettings, Race } from '@/lib/storage'

export default function HeatsPage() {
  const [race, set_race] = useState<Race | null>(null)
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [is_rerun_modal_open, set_is_rerun_modal_open] = useState(false)

  const fetchData = async () => {
    const [race_data, settings_data] = await Promise.all([
      fetch('/api/race').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ])
    set_race(race_data)
    set_settings(settings_data)
    set_is_loading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleGenerateHeats = async () => {
    const response = await fetch('/api/race', {
      method: 'POST',
      body: JSON.stringify({ action: 'generate_heats' }),
    })
    const data = await response.json()
    set_race(data)
  }

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
  }

  const triggerGate = async () => {
    if (!race || race.current_heat_id === null) return
    const response = await fetch('/api/race', {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'trigger_gate',
        heat_id: race.current_heat_id
      }),
    })
    const data = await response.json()
    set_race(data)
    await fetch('/api/hardware?action=gate_test')
  }

  const handleTriggerGate = async () => {
    if (!race || race.current_heat_id === null) return
    const current_heat = race.heats.find(h => h.id === race.current_heat_id)
    if (!current_heat) return

    const has_times = current_heat.lanes.some(l => l.time !== null)
    
    if (has_times) {
      set_is_rerun_modal_open(true)
    } else {
      await triggerGate()
    }
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

  return (
    <Container className="py-24">
      <CountdownOverlay countdown_end={race.countdown_end} />
      <div className="flex items-end justify-between">
        <div>
          <Subheading>Race Control</Subheading>
          <Heading className="mt-2">Heat Administration</Heading>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" href="/manual-heat">Manual Heat</Button>
          <Button onClick={handleGenerateHeats}>Generate Heats</Button>
        </div>
      </div>

      {heats.length === 0 ? (
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
                  <div className="text-xs font-bold text-gray-400 uppercase">Currently Running</div>
                  <h2 className="text-3xl font-bold">Heat #{current_heat.id}</h2>
                </div>
                <Button 
                  disabled={!is_current_heat_finished || current_heat_index === heats.length - 1}
                  onClick={handleNextHeat}
                >
                  Next Heat
                </Button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {current_heat.lanes.map((lane, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="text-xs font-medium text-gray-400 uppercase">Lane {i + 1}</div>
                    <div className="mt-2 text-2xl font-bold">
                      {lane.car_id ? `Car #${lane.car_id}` : 'Empty'}
                    </div>
                    <div className="mt-4 font-mono text-4xl text-blue-600">
                      {lane.time && (!race.countdown_end || Date.now() > race.countdown_end) ? lane.time?.toFixed(3) : '--.---'}
                    </div>
                    {lane.car_id && !lane.time && (
                      <div className="mt-4 flex gap-2">
                        <input 
                          type="number" 
                          step="0.001" 
                          placeholder="Time"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              submitTime(i, parseFloat((e.target as HTMLInputElement).value))
                            }
                          }}
                          className="w-full rounded bg-white/10 px-2 py-1 text-sm text-white focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-10 flex justify-center border-t border-white/10 pt-8">
                <Button 
                  onClick={handleTriggerGate}
                  className="w-full sm:w-auto px-16 py-3 text-lg !bg-blue-600 !text-white hover:!bg-blue-500 border-none shadow-lg shadow-blue-900/20"
                >
                  Trigger Gate
                </Button>
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

      <Dialog open={is_rerun_modal_open} onClose={() => set_is_rerun_modal_open(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <DialogTitle className="text-xl font-bold text-gray-950">Rerun Heat?</DialogTitle>
            <p className="mt-4 text-sm text-gray-500">
              This heat already has times recorded. Rerunning will overwrite the existing results for all cars in this heat.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => set_is_rerun_modal_open(false)}>
                Cancel
              </Button>
              <Button 
                className="!bg-red-600 !text-white hover:!bg-red-500"
                onClick={async () => {
                  set_is_rerun_modal_open(false)
                  await triggerGate()
                }}
              >
                Rerun Heat
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Container>
  )
}
