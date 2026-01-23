'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/components/container'
import { Car, BeautyScore, Judge, RaceSettings } from '@/lib/storage'
import { XMarkIcon } from '@heroicons/react/20/solid'
import Image from 'next/image'

interface PhotoModalProps {
  photo_hash: string
  car_name: string
  onClose: () => void
}

function PhotoModal({ photo_hash, car_name, onClose }: PhotoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 hover:bg-white/20"
      >
        <XMarkIcon className="size-8 text-white" />
      </button>
      <div className="relative max-h-[80vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={`/photos/${photo_hash}.jpg`}
          alt={car_name}
          width={800}
          height={600}
          className="max-h-[80vh] w-auto rounded-lg object-contain"
        />
      </div>
    </div>
  )
}

export default function JudgingPage() {
  const search_params = useSearchParams()
  const url_judge_id = search_params.get('judge')
  
  const [cars, set_cars] = useState<Car[]>([])
  const [judges, set_judges] = useState<Judge[]>([])
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [selected_judge_id, set_selected_judge_id] = useState<string>('')
  const [division_filter, set_division_filter] = useState<string>('')
  const [expanded_photo, set_expanded_photo] = useState<{ hash: string; name: string } | null>(null)

  // Set judge from URL param only
  useEffect(() => {
    if (url_judge_id) {
      set_selected_judge_id(url_judge_id)
    }
  }, [url_judge_id])

  useEffect(() => {
    Promise.all([
      fetch('/api/cars').then(res => res.json()),
      fetch('/api/judges').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([cars_data, judges_data, settings_data]) => {
      set_cars(cars_data)
      set_judges(judges_data)
      set_settings(settings_data)
      set_is_loading(false)
    })
  }, [])

  const selected_judge = judges.find(j => j.id === selected_judge_id)

  // Get available divisions for this judge
  const available_divisions = selected_judge?.allowed_divisions.length 
    ? selected_judge.allowed_divisions 
    : (settings?.divisions || [])

  // Filter cars
  const filtered_cars = cars.filter((car) => {
    // Must be beauty judging eligible
    if (!car.is_beauty) return false
    // Must be REGISTERED or COURTESY
    if (car.registration_status !== 'REGISTERED' && car.registration_status !== 'COURTESY') return false
    // Must be in an allowed division for this judge
    if (!available_divisions.includes(car.division)) return false
    // Division filter
    if (division_filter && car.division !== division_filter) return false
    return true
  })

  const handleScore = async (car_id: number, score: number) => {
    if (!selected_judge_id) {
      alert('Please select a judge first')
      return
    }

    const car = cars.find(c => c.id === car_id)
    if (!car) return

    const new_score: BeautyScore = {
      score,
      judge_id: selected_judge_id,
      timestamp: new Date().toISOString(),
      is_included: true,
    }
    const new_scores = [...car.beauty_scores, new_score]
    
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

  const getJudgeScoreForCar = (car: Car) => {
    if (!selected_judge_id) return null
    return car.beauty_scores.find(s => s.judge_id === selected_judge_id)
  }

  if (is_loading) {
    return (
      <Container className="py-24">
        <p className="text-gray-500">Loading...</p>
      </Container>
    )
  }

  return (
    <Container className="py-12">
      {/* Judge info and Division selector */}
      {selected_judge && (
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Judging as
            </label>
            <div className="rounded-lg bg-gray-100 py-3 px-4 text-sm font-bold text-gray-950">
              {selected_judge.name}
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Division
            </label>
            <select
              value={division_filter}
              onChange={(e) => set_division_filter(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 py-3 px-4 text-sm font-medium focus:border-gray-950 focus:outline-none"
            >
              <option value="">All Divisions</option>
              {available_divisions.map((div) => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Cars list */}
      <div className="mt-8">
        {!selected_judge_id ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500 mb-2">No judge selected.</p>
            <p className="text-sm text-gray-400">Please scan your personal QR code from the Judges page to access your scoring screen.</p>
          </div>
        ) : filtered_cars.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No cars to judge in this division.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered_cars.map((car) => {
              const existing_score = getJudgeScoreForCar(car)
              return (
                <div 
                  key={car.id} 
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  {/* Car name at top */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-400">#{car.id}</span>
                    <h3 className="font-bold text-gray-950">{car.car_name}</h3>
                    {existing_score && (
                      <span className="ml-auto text-xs text-green-600 font-medium">
                        Scored: {existing_score.score}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Photo thumbnail */}
                    <button
                      onClick={() => car.photo_hash && set_expanded_photo({ hash: car.photo_hash, name: car.car_name })}
                      className="relative size-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100"
                    >
                      {car.photo_hash ? (
                        <Image
                          src={`/photos/${car.photo_hash}.jpg`}
                          alt={car.car_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          No img
                        </div>
                      )}
                    </button>

                    {/* Score buttons */}
                    <div className="flex gap-1 flex-wrap justify-end flex-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          onClick={() => handleScore(car.id, score)}
                          className={`size-11 rounded-lg text-sm font-bold transition-colors ${
                            existing_score?.score === score
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Photo modal */}
      {expanded_photo && (
        <PhotoModal
          photo_hash={expanded_photo.hash}
          car_name={expanded_photo.name}
          onClose={() => set_expanded_photo(null)}
        />
      )}
    </Container>
  )
}
