'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Car, RaceSettings } from '@/lib/storage'

const SCOUT_LEVELS = ['Lion', 'Tiger', 'Wolf', 'Bear', 'Webelos', 'AOL', 'Family', 'Overall']

export default function ResultsPage() {
  const [cars, set_cars] = useState<Car[]>([])
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [pending_presentation, set_pending_presentation] = useState<{ type: 'speed' | 'beauty'; level: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/cars').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([cars_data, settings_data]) => {
      set_cars(cars_data)
      set_settings(settings_data)
      set_is_loading(false)
    })
  }, [])

  const confirmPresent = async () => {
    if (!settings || !pending_presentation) return
    const new_settings = {
      ...settings,
      presentation: {
        type: pending_presentation.type,
        scout_level: pending_presentation.level,
        is_visible: true
      }
    }
    set_settings(new_settings)
    await fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(new_settings),
    })
    set_pending_presentation(null)
  }

  const handleStopPresenting = async () => {
    if (!settings) return
    const new_settings = {
      ...settings,
      presentation: {
        ...settings.presentation,
        is_visible: false
      } as any
    }
    set_settings(new_settings)
    await fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(new_settings),
    })
  }

  const getSpeedResults = (level: string) => {
    return cars
      .filter(c => (level === 'Overall' || c.scout_level === level) && c.average_time)
      .sort((a, b) => (a.average_time || 0) - (b.average_time || 0))
  }

  const getBeautyResults = (level: string) => {
    return cars
      .filter(c => (level === 'Overall' || c.scout_level === level) && c.is_beauty && c.beauty_scores.length > 0)
      .sort((a, b) => {
        const a_avg = a.beauty_scores.reduce((sum, s) => sum + s, 0) / a.beauty_scores.length
        const b_avg = b.beauty_scores.reduce((sum, s) => sum + s, 0) / b.beauty_scores.length
        return b_avg - a_avg
      })
  }

  if (is_loading) return <Container className="py-24">Loading...</Container>

  return (
    <Container className="py-24">
      <div className="flex items-end justify-between">
        <div>
          <Subheading>Final Standings</Subheading>
          <Heading className="mt-2">Race Results</Heading>
        </div>
        {settings?.presentation?.is_visible && (
          <div className="flex items-center gap-4 rounded-xl bg-blue-50 px-4 py-2 ring-1 ring-blue-600/20">
            <div className="text-sm font-bold text-blue-600 uppercase">
              Presenting: {settings.presentation.scout_level} {settings.presentation.type}
            </div>
            <Button variant="outline" onClick={handleStopPresenting}>Stop Presenting</Button>
          </div>
        )}
      </div>

      <div className="mt-12 space-y-16">
        <section>
          <h2 className="text-2xl font-black italic text-blue-600 uppercase">Speed Standings</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {SCOUT_LEVELS.map(level => {
              const results = getSpeedResults(level)
              if (results.length === 0) return null
              return (
                <div key={level} className="rounded-2xl border border-gray-200 p-8 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-950">{level}</h3>
                    <Button variant="outline" onClick={() => set_pending_presentation({ type: 'speed', level })}>Present</Button>
                  </div>
                  <div className="mt-6 space-y-4">
                    {results.slice(0, 3).map((car, i) => (
                      <div key={car.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex size-8 items-center justify-center rounded-full font-bold ${
                            i === 0 ? 'bg-yellow-400 text-yellow-950' :
                            i === 1 ? 'bg-gray-300 text-gray-800' :
                            'bg-orange-300 text-orange-900'
                          }`}>
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-bold text-gray-950">#{car.id} {car.car_name}</div>
                            <div className="text-xs text-gray-500 uppercase">{car.first_name} {car.last_name}</div>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-gray-950">{car.average_time?.toFixed(4)}s</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black italic text-blue-600 uppercase">Beauty Standings</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {SCOUT_LEVELS.map(level => {
              const results = getBeautyResults(level)
              if (results.length === 0) return null
              return (
                <div key={level} className="rounded-2xl border border-gray-200 p-8 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-950">{level}</h3>
                    <Button variant="outline" onClick={() => set_pending_presentation({ type: 'beauty', level })}>Present</Button>
                  </div>
                  <div className="mt-6 space-y-4">
                    {results.slice(0, 3).map((car, i) => {
                      const avg = car.beauty_scores.reduce((a, b) => a + b, 0) / car.beauty_scores.length
                      return (
                        <div key={car.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`flex size-8 items-center justify-center rounded-full font-bold ${
                              i === 0 ? 'bg-yellow-400 text-yellow-950' :
                              i === 1 ? 'bg-gray-300 text-gray-800' :
                              'bg-orange-300 text-orange-900'
                            }`}>
                              {i + 1}
                            </div>
                            <div>
                              <div className="font-bold text-gray-950">#{car.id} {car.car_name}</div>
                              <div className="text-xs text-gray-500 uppercase">{car.first_name} {car.last_name}</div>
                            </div>
                          </div>
                          <div className="font-bold text-gray-950">{avg.toFixed(1)} pts</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <Dialog open={pending_presentation !== null} onClose={() => set_pending_presentation(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <DialogTitle className="text-xl font-bold text-gray-950">Present Results?</DialogTitle>
            <p className="mt-4 text-sm text-gray-500">
              This will display <span className="font-bold text-gray-950">{pending_presentation?.level} {pending_presentation?.type}</span> results on the public screen.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => set_pending_presentation(null)}>
                Cancel
              </Button>
              <Button onClick={confirmPresent}>
                Show Results
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Container>
  )
}
