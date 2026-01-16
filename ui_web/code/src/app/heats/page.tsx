'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Heat, RaceSettings } from '@/lib/storage'

export default function HeatsPage() {
  const [heats, set_heats] = useState<Heat[]>([])
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [current_heat_index, set_current_heat_index] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/heats').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([heats_data, settings_data]) => {
      set_heats(heats_data)
      set_settings(settings_data)
      set_is_loading(false)
    })
  }, [])

  const handleGenerateHeats = async () => {
    const response = await fetch('/api/heats', {
      method: 'POST',
      body: JSON.stringify({ action: 'generate' }),
    })
    const data = await response.json()
    set_heats(data)
  }

  const handleNextHeat = () => {
    if (current_heat_index < heats.length - 1) {
      set_current_heat_index(current_heat_index + 1)
    }
  }

  const submitTime = async (lane_index: number, time: number) => {
    const heat = heats[current_heat_index]
    const response = await fetch('/api/heats', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_time',
        heat_id: heat.id,
        lane_index,
        time
      }),
    })
    const data = await response.json()
    set_heats(data)
  }

  if (is_loading || !settings) return <Container className="py-24">Loading...</Container>

  const current_heat = heats[current_heat_index]
  const is_current_heat_finished = current_heat && current_heat.lane_times.every((t, i) => current_heat.lane_cars[i] === null || t !== null)

  return (
    <Container className="py-24">
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
              {current_heat.lane_cars.map((car_id, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="text-xs font-medium text-gray-400 uppercase">Lane {i + 1}</div>
                  <div className="mt-2 text-2xl font-bold">
                    {car_id ? `Car #${car_id}` : 'Empty'}
                  </div>
                  <div className="mt-4 font-mono text-4xl text-[#D15052]">
                    {current_heat.lane_times[i] ? current_heat.lane_times[i]?.toFixed(3) : '--.---'}
                  </div>
                  {car_id && !current_heat.lane_times[i] && (
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
          </section>

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
                      {heat.lane_cars.map((car_id, i) => (
                        <td key={i} className="py-4 pr-4">
                          <div className="text-gray-950">{car_id ? `#${car_id}` : '-'}</div>
                          <div className="text-xs text-gray-400">
                            {heat.lane_times[i] ? `${heat.lane_times[i]?.toFixed(3)}s` : '--.---'}
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
    </Container>
  )
}
