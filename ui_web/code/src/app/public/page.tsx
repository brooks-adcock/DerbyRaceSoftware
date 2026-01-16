'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Car, Heat, RaceSettings } from '@/lib/storage'
import Image from 'next/image'

export default function PublicPage() {
  const [current_heat, set_current_heat] = useState<Heat | null>(null)
  const [next_heat, set_next_heat] = useState<Heat | null>(null)
  const [cars, set_cars] = useState<Record<number, Car>>({})
  const [is_loading, set_is_loading] = useState(true)

  const fetchData = async () => {
    const [heats_res, cars_res] = await Promise.all([
      fetch('/api/heats').then(res => res.json()),
      fetch('/api/cars').then(res => res.json())
    ])

    const cars_map: Record<number, Car> = {}
    cars_res.forEach((c: Car) => cars_map[c.id] = c)
    set_cars(cars_map)

    // For simplicity, current heat is the first one that isn't fully timed
    const current_idx = heats_res.findIndex((h: Heat) => h.lane_times.some(t => t === null && h.lane_cars[heats_res.indexOf(h)] !== null))
    const current = current_idx !== -1 ? heats_res[current_idx] : heats_res[heats_res.length - 1]
    const next = current_idx !== -1 && current_idx < heats_res.length - 1 ? heats_res[current_idx + 1] : null

    set_current_heat(current)
    set_next_heat(next)
    set_is_loading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [])

  if (is_loading || !current_heat) return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
      <div className="text-4xl font-bold animate-pulse">Waiting for Race...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Current Heat Main Area */}
      <div className="flex h-[75vh] flex-col p-12">
        <div className="flex items-center justify-between">
          <h1 className="text-6xl font-black tracking-tighter italic text-[#D15052]">HEAT #{current_heat.id}</h1>
          <div className="text-3xl font-bold text-gray-500 uppercase">LIVE RESULTS</div>
        </div>

        <div className="mt-12 grid flex-1 grid-cols-1 gap-8 lg:grid-cols-4">
          {current_heat.lane_cars.map((car_id, i) => {
            const car = car_id ? cars[car_id] : null
            return (
              <div key={i} className="flex flex-col rounded-3xl bg-white/5 p-8 ring-1 ring-white/10 backdrop-blur-xl">
                <div className="text-2xl font-black text-gray-500 italic">LANE {i + 1}</div>
                <div className="mt-4 flex-1">
                  {car ? (
                    <div className="space-y-6">
                      <div className="relative aspect-square overflow-hidden rounded-2xl">
                        {car.photo_hash ? (
                          <Image
                            src={`/photos/${car.photo_hash}.jpg`}
                            alt={car.car_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gray-800 text-6xl font-black text-gray-700">
                            #{car.id}
                          </div>
                        )}
                        <div className="absolute top-4 left-4 rounded-3xl bg-gray-950 px-8 py-4 shadow-2xl backdrop-blur-xl border border-white/20">
                          <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] leading-none">Car #</div>
                          <div className="text-6xl font-black text-white mt-2 leading-none">
                            {car.id}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-black truncate">{car.car_name}</div>
                        <div className="mt-2 text-xl font-medium text-gray-400 uppercase">{car.first_name} {car.last_name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl font-black text-white/5 uppercase italic">Empty</div>
                  )}
                </div>
                <div className="mt-8 text-center">
                  <div className={`font-mono text-8xl font-black tracking-tighter ${
                    current_heat.lane_times[i] ? 'text-green-400' : 'text-white/20'
                  }`}>
                    {current_heat.lane_times[i] ? current_heat.lane_times[i]?.toFixed(3) : '0.000'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Next Heat Footer */}
      {next_heat && (
        <div className="h-[25vh] border-t border-white/10 bg-white/5 p-12 backdrop-blur-2xl">
          <div className="flex items-center gap-12">
            <div className="shrink-0">
              <div className="text-sm font-bold text-gray-500 uppercase">Up Next</div>
              <div className="text-4xl font-black italic text-[#D15052]">HEAT #{next_heat.id}</div>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-8">
              {next_heat.lane_cars.map((car_id, i) => {
                const car = car_id ? cars[car_id] : null
                if (!car) return <div key={i} />
                return (
                  <div key={i} className="flex items-center gap-6 overflow-hidden">
                    <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-gray-800">
                      {car.photo_hash && (
                        <Image
                          src={`/photos/${car.photo_hash}.jpg`}
                          alt={car.car_name}
                          width={80}
                          height={80}
                          className="size-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-black truncate">#{car.id} {car.car_name}</div>
                      <div className="text-sm font-medium text-gray-400 uppercase truncate">{car.first_name} {car.last_name}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
