'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Breadcrumb } from '@/components/breadcrumb'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { BoltIcon, SparklesIcon } from '@heroicons/react/24/solid'
import type { Car, RaceSettings } from '@/lib/storage'

const STORAGE_KEY_DIVISIONS = 'standings_selected_divisions'
const STORAGE_KEY_TAB = 'standings_selected_tab'

export default function StandingsPage() {
  const router = useRouter()
  const [cars, set_cars] = useState<Car[]>([])
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [selected_divisions, set_selected_divisions] = useState<string[]>([])
  const [selected_tab, set_selected_tab] = useState(0)

  // Load from localStorage and fetch data
  useEffect(() => {
    let saved_divisions: string[] | null = null
    
    if (typeof window !== 'undefined') {
      const saved_divisions_str = localStorage.getItem(STORAGE_KEY_DIVISIONS)
      if (saved_divisions_str !== null) {
        try {
          const parsed = JSON.parse(saved_divisions_str)
          if (Array.isArray(parsed)) {
            saved_divisions = parsed
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      const saved_tab = localStorage.getItem(STORAGE_KEY_TAB)
      if (saved_tab) {
        const tab_index = parseInt(saved_tab, 10)
        if (!isNaN(tab_index) && tab_index >= 0 && tab_index <= 1) {
          set_selected_tab(tab_index)
        }
      }
    }

    Promise.all([
      fetch('/api/cars').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([cars_data, settings_data]) => {
      set_cars(cars_data)
      set_settings(settings_data)
      
      // Use saved divisions if available, otherwise default to all divisions
      if (saved_divisions !== null) {
        // Validate saved divisions against available divisions
        const available = settings_data?.divisions || []
        const validated = saved_divisions.filter(d => available.includes(d))
        set_selected_divisions(validated)
      } else {
        // No saved state, default to all divisions
        set_selected_divisions(settings_data?.divisions || [])
      }
      
      set_is_loading(false)
    })
  }, [])

  // Save to localStorage when selected_divisions changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !is_loading) {
      localStorage.setItem(STORAGE_KEY_DIVISIONS, JSON.stringify(selected_divisions))
    }
  }, [selected_divisions, is_loading])

  // Save to localStorage when selected_tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TAB, selected_tab.toString())
    }
  }, [selected_tab])

  const toggleDivision = (division: string) => {
    set_selected_divisions(prev => 
      prev.includes(division) 
        ? prev.filter(d => d !== division)
        : [...prev, division]
    )
  }

  const getSpeedRankedCars = () => {
    return cars
      .filter(c => {
        if (!c.average_time || c.average_time <= 0) return false
        if (selected_divisions.length > 0 && !selected_divisions.includes(c.division)) return false
        return true
      })
      .sort((a, b) => (a.average_time || 0) - (b.average_time || 0))
  }

  const getBeautyRankedCars = () => {
    return cars
      .filter(c => {
        if (!c.average_beauty_score || c.average_beauty_score <= 0) return false
        if (selected_divisions.length > 0 && !selected_divisions.includes(c.division)) return false
        return true
      })
      .sort((a, b) => (b.average_beauty_score || 0) - (a.average_beauty_score || 0))
  }

  const handleRowClick = (car_id: number) => {
    router.push(`/cars/${car_id}`)
  }

  if (is_loading) return <Container className="py-24">Loading...</Container>

  const speed_ranked = getSpeedRankedCars()
  const beauty_ranked = getBeautyRankedCars()

  return (
    <Container className="py-24">
      <Breadcrumb />
      <div>
        <Subheading>Leaderboard</Subheading>
        <Heading className="mt-2">Standings</Heading>
      </div>

      {/* Division Filter */}
      <div className="mt-8">
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

      <TabGroup selectedIndex={selected_tab} onChange={set_selected_tab} className="mt-8">
        <TabList className="flex gap-2 rounded-xl bg-gray-100 p-1">
          <Tab className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors focus:outline-none data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-gray-950 text-gray-500 hover:text-gray-700">
            <BoltIcon className="size-4" />
            Speed
          </Tab>
          <Tab className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors focus:outline-none data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-gray-950 text-gray-500 hover:text-gray-700">
            <SparklesIcon className="size-4" />
            Beauty
          </Tab>
        </TabList>

        <TabPanels className="mt-8">
          {/* Speed Tab */}
          <TabPanel>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Place</th>
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Number</th>
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Name</th>
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Car</th>
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Avg Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {speed_ranked.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No race times recorded yet.
                      </td>
                    </tr>
                  ) : (
                    speed_ranked.map((car, index) => (
                      <tr 
                        key={car.id} 
                        onClick={() => handleRowClick(car.id)}
                        className="group cursor-pointer hover:bg-gray-50 transition-colors"
                      >
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
                        <td className="py-4 pr-4 text-gray-600">{car.first_name} {car.last_name}</td>
                        <td className="py-4 pr-4 font-bold text-gray-950">{car.car_name}</td>
                        <td className="py-4 pr-4 font-mono font-bold text-gray-950">{car.average_time?.toFixed(4)}s</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabPanel>

          {/* Beauty Tab */}
          <TabPanel>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Place</th>
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Number</th>
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Name</th>
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Car</th>
                    <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {beauty_ranked.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No beauty scores recorded yet.
                      </td>
                    </tr>
                  ) : (
                    beauty_ranked.map((car, index) => (
                      <tr 
                        key={car.id} 
                        onClick={() => handleRowClick(car.id)}
                        className="group cursor-pointer hover:bg-gray-50 transition-colors"
                      >
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
                        <td className="py-4 pr-4 text-gray-600">{car.first_name} {car.last_name}</td>
                        <td className="py-4 pr-4 font-bold text-gray-950">{car.car_name}</td>
                        <td className="py-4 pr-4 font-mono font-bold text-gray-950">{car.average_beauty_score?.toFixed(1)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </Container>
  )
}
