'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Car } from '@/lib/storage'
import Image from 'next/image'

export default function JudgingPage() {
  const [cars, set_cars] = useState<Car[]>([])
  const [is_loading, set_is_loading] = useState(true)

  useEffect(() => {
    fetch('/api/cars')
      .then((res) => res.json())
      .then((data) => {
        set_cars(data.filter((c: Car) => c.is_beauty))
        set_is_loading(false)
      })
  }, [])

  const handleScore = async (car_id: number, score: number) => {
    const car = cars.find(c => c.id === car_id)
    if (!car) return

    const new_scores = [...car.beauty_scores, score]
    
    try {
      const response = await fetch(`/api/cars/${car_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beauty_scores: new_scores }),
      })
      const updated_car = await response.json()
      set_cars(cars.map(c => c.id === car_id ? updated_car : c))
    } catch (error) {
      console.error(error)
      alert('Failed to save score')
    }
  }

  return (
    <Container className="py-24">
      <Subheading>Judging</Subheading>
      <Heading className="mt-2">Beauty Class Scoring</Heading>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {is_loading ? (
          <p>Loading cars...</p>
        ) : cars.length === 0 ? (
          <p>No cars entered for beauty judging.</p>
        ) : (
          cars.map((car) => (
            <div key={car.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
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
                <h3 className="text-lg font-bold text-gray-950">{car.car_name}</h3>
                <p className="text-sm text-gray-500">{car.first_name} {car.last_name}</p>
                
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-gray-400 uppercase">Average Score</label>
                  <div className="mt-1 text-2xl font-bold text-gray-950">
                    {car.beauty_scores.length > 0 
                      ? (car.beauty_scores.reduce((a, b) => a + b, 0) / car.beauty_scores.length).toFixed(1)
                      : 'N/A'}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-950">Add Score</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleScore(car.id, parseInt(e.target.value))
                      e.target.value = ""
                    }}
                    className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-950 focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Select Score (1-10)</option>
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Container>
  )
}
