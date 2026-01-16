'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Car, RaceSettings } from '@/lib/storage'
import Image from 'next/image'

export default function Home() {
  const [cars, set_cars] = useState<Car[]>([])
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [is_loading, set_is_loading] = useState(true)

  useEffect(() => {
    const fetchMyCars = async () => {
      const my_car_ids: number[] = JSON.parse(localStorage.getItem('my_cars') || '[]')
      
      try {
        const [cars_res, settings_res] = await Promise.all([
          fetch('/api/cars'),
          fetch('/api/settings')
        ])
        
        const all_cars: Car[] = await cars_res.json()
        const settings_data: RaceSettings = await settings_res.json()
        
        set_settings(settings_data)
        const my_cars = all_cars.filter(car => my_car_ids.includes(car.id))
        set_cars(my_cars)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        set_is_loading(false)
      }
    }

    fetchMyCars()
  }, [])

  return (
    <Container className="py-24">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Subheading>Entrant</Subheading>
          <Heading className="mt-2">My Registrations</Heading>
        </div>
        <Button href="/register">Register Another Car</Button>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {is_loading ? (
          <p>Loading your cars...</p>
        ) : cars.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-gray-500">You haven't registered any cars yet.</p>
            <Button href="/register" className="mt-6">Register Your First Car</Button>
          </div>
        ) : (
          cars.map((car) => (
            <div key={car.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="relative h-48 w-full bg-gray-100">
                {car.photo_hash ? (
                  <Image
                    src={`/photos/${car.photo_hash}.jpg`}
                    alt={car.car_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">No Image</div>
                )}
                <div className="absolute top-4 left-4 rounded-xl bg-gray-950/90 px-4 py-2 shadow-2xl backdrop-blur-sm border border-white/10">
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none text-center">Car #</div>
                  <div className="text-xl font-black text-white mt-1 leading-none text-center">{car.id}</div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-950">{car.car_name}</h3>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    car.registration_status === 'REGISTERED' ? 'bg-green-100 text-green-700' :
                    car.registration_status === 'REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {car.registration_status === 'STARTED' ? 'Registration Started' : car.registration_status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{car.scout_level} Level</p>
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weight</div>
                    <div className="text-sm font-bold text-gray-950">
                      {car.weight_oz > 0 ? `${car.weight_oz.toFixed(2)} oz` : 'Pending'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Time</div>
                    <div className="text-sm font-bold text-[#D15052]">
                      {car.average_time ? `${car.average_time.toFixed(3)}s` : '--.---'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-6">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Track Times</div>
                  <div className="flex gap-2">
                    {[...Array(settings?.n_tracks || 4)].map((_, i) => {
                      const time = car.track_times[i]?.time
                      return (
                        <div key={i} className="flex-1 rounded bg-gray-50 py-2 text-center">
                          <div className="text-[8px] font-bold text-gray-400 uppercase">T{i+1}</div>
                          <div className="mt-1 font-mono text-xs font-bold text-gray-600">
                            {time ? time.toFixed(3) : '--'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {car.registration_status === 'STARTED' && (
                  <p className="mt-6 text-xs text-gray-500 italic text-center bg-gray-50 rounded-lg p-3">
                    Take your car to the check-in station to complete registration.
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Container>
  )
}
