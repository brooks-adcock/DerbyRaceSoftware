'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Breadcrumb } from '@/components/breadcrumb'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { TrophyIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import type { Car, RaceSettings } from '@/lib/storage'

export default function ResultsPage() {
  const [cars, set_cars] = useState<Car[]>([])
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [is_prize_modal_open, set_is_prize_modal_open] = useState(false)
  const [prize_name, set_prize_name] = useState('')
  const [selected_divisions, set_selected_divisions] = useState<string[]>([])
  const [selected_winner_id, set_selected_winner_id] = useState<number | null>(null)

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

  const openPrizeModal = () => {
    set_prize_name('')
    set_selected_divisions(settings?.divisions || [])
    set_selected_winner_id(null)
    set_is_prize_modal_open(true)
  }

  const toggleDivision = (division: string) => {
    set_selected_divisions(prev => 
      prev.includes(division) 
        ? prev.filter(d => d !== division)
        : [...prev, division]
    )
    // Clear winner if they're no longer in selected divisions
    if (selected_winner_id) {
      const winner = cars.find(c => c.id === selected_winner_id)
      if (winner && !selected_divisions.includes(winner.division)) {
        set_selected_winner_id(null)
      }
    }
  }

  const handleShowOnPublic = async () => {
    if (!settings || !prize_name || selected_winner_id === null) return
    const new_settings = {
      ...settings,
      presentation: {
        prize_name,
        winner_car_id: selected_winner_id,
        is_visible: true
      }
    }
    set_settings(new_settings)
    await fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(new_settings),
    })
    set_is_prize_modal_open(false)
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

  // Get all cars sorted by average time, excluding those without times (DNF)
  const getRankedCars = () => {
    return cars
      .filter(c => c.average_time && c.average_time > 0)
      .sort((a, b) => (a.average_time || 0) - (b.average_time || 0))
  }

  // Get filtered cars for prize modal
  const getFilteredCars = () => {
    return cars
      .filter(c => {
        if (!c.average_time || c.average_time <= 0) return false
        if (selected_divisions.length > 0 && !selected_divisions.includes(c.division)) return false
        return true
      })
      .sort((a, b) => (a.average_time || 0) - (b.average_time || 0))
  }

  if (is_loading) return <Container className="py-24">Loading...</Container>

  const ranked_cars = getRankedCars()
  const filtered_cars = getFilteredCars()

  return (
    <Container className="py-24">
      <Breadcrumb />
      <div className="flex items-end justify-between">
        <div>
          <Subheading>Final Standings</Subheading>
          <Heading className="mt-2">Race Results</Heading>
        </div>
        <div className="flex items-center gap-4">
          {settings?.presentation?.is_visible && (
            <div className="flex items-center gap-4 rounded-xl bg-blue-50 px-4 py-2 ring-1 ring-blue-600/20">
              <div className="text-sm font-bold text-blue-600">
                Presenting: {settings.presentation.prize_name}
              </div>
              <Button variant="outline" onClick={handleStopPresenting}>Stop Presenting</Button>
            </div>
          )}
          <Button onClick={openPrizeModal}>
            <TrophyIcon className="size-4 mr-2" />
            Show Prize
          </Button>
        </div>
      </div>

      {/* Full Results Table */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-gray-950">All Entrants by Average Time</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Place</th>
                <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Car #</th>
                <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Car Name</th>
                <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Owner</th>
                <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Division</th>
                <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ranked_cars.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No race times recorded yet.
                  </td>
                </tr>
              ) : (
                ranked_cars.map((car, index) => (
                  <tr key={car.id} className="group hover:bg-gray-50">
                    <td className="py-4 pr-4">
                      <div className={`flex size-8 items-center justify-center rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-yellow-950' :
                        index === 1 ? 'bg-gray-300 text-gray-800' :
                        index === 2 ? 'bg-orange-300 text-orange-900' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-black text-gray-950">#{car.id}</td>
                    <td className="py-4 pr-4 font-bold text-gray-950">{car.car_name}</td>
                    <td className="py-4 pr-4 text-gray-600">{car.first_name} {car.last_name}</td>
                    <td className="py-4 pr-4 text-gray-600">{car.division}</td>
                    <td className="py-4 pr-4 font-mono font-bold text-gray-950">{car.average_time?.toFixed(4)}s</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Prize Modal */}
      <Dialog open={is_prize_modal_open} onClose={() => set_is_prize_modal_open(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-2xl w-full rounded-2xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-xl font-bold text-gray-950">Award Prize</DialogTitle>
            
            {/* Prize Name */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-950">Prize Name *</label>
              <input
                type="text"
                value={prize_name}
                onChange={(e) => set_prize_name(e.target.value)}
                placeholder="e.g., 1st Place - Older Scouts"
                className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
              />
            </div>

            {/* Division Filter */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-950 mb-2">Filter by Division</label>
              <div className="flex flex-wrap gap-2">
                {(settings?.divisions || []).map((division) => (
                  <button
                    key={division}
                    onClick={() => toggleDivision(division)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      selected_divisions.includes(division)
                        ? 'bg-gray-950 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {division}
                  </button>
                ))}
              </div>
            </div>

            {/* Entrant Selection List */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-950 mb-2">Select Winner</label>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {filtered_cars.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    No cars match the selected divisions.
                  </div>
                ) : (
                  filtered_cars.map((car, index) => (
                    <button
                      key={car.id}
                      onClick={() => set_selected_winner_id(car.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selected_winner_id === car.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex size-8 items-center justify-center rounded-full font-bold text-sm ${
                          index === 0 ? 'bg-yellow-400 text-yellow-950' :
                          index === 1 ? 'bg-gray-300 text-gray-800' :
                          index === 2 ? 'bg-orange-300 text-orange-900' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-gray-950">#{car.id} {car.car_name}</div>
                          <div className="text-xs text-gray-500">{car.first_name} {car.last_name} · {car.division}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-sm text-gray-600">{car.average_time?.toFixed(4)}s</div>
                        {selected_winner_id === car.id && (
                          <CheckCircleIcon className="size-5 text-blue-500" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => set_is_prize_modal_open(false)}>Cancel</Button>
              <Button 
                onClick={handleShowOnPublic}
                disabled={!prize_name.trim() || selected_winner_id === null}
              >
                Show on Public
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Container>
  )
}
