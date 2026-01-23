'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Car, BeautyScore, Judge, RaceSettings } from '@/lib/storage'
import { XMarkIcon, StarIcon } from '@heroicons/react/20/solid'
import Image from 'next/image'

interface PhotoModalProps {
  photo_hash: string
  car_name: string
  onClose: () => void
}

function PhotoModal({ photo_hash, car_name, onClose }: PhotoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={onClose}>
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 rounded-full bg-white/10 p-3 ring-1 ring-white/20 transition-all hover:bg-white/20 hover:scale-110"
      >
        <XMarkIcon className="size-6 text-white" />
      </button>
      <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={`/photos/${photo_hash}.jpg`}
          alt={car_name}
          width={800}
          height={600}
          className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl ring-2 ring-white/20"
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
  const [pending_scores, set_pending_scores] = useState<Record<number, number>>({})

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

    // Optimistic update - show pending state immediately
    set_pending_scores(prev => ({ ...prev, [car_id]: score }))

    const new_score: BeautyScore = {
      score,
      judge_id: selected_judge_id,
      timestamp: new Date().toISOString(),
      is_included: true,
    }
    
    // Replace existing score from this judge, or add new one
    const existing_index = car.beauty_scores.findIndex(s => s.judge_id === selected_judge_id)
    const new_scores = existing_index >= 0
      ? car.beauty_scores.map((s, i) => i === existing_index ? new_score : s)
      : [...car.beauty_scores, new_score]
    
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
    } finally {
      // Clear pending state
      set_pending_scores(prev => {
        const next = { ...prev }
        delete next[car_id]
        return next
      })
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
    <Container className="py-24">
      {/* Header */}
      <div className="mb-12">
        <Subheading>Design Competition</Subheading>
        <Heading className="mt-2">Beauty Judging</Heading>
      </div>

      {/* Judge info and Division selector */}
      {selected_judge && (
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Judging as
            </label>
            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 py-4 px-6 ring-1 ring-gray-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white shadow-inner">
                <StarIcon className="h-5 w-5" />
              </div>
              <div className="text-base font-bold text-gray-950">
                {selected_judge.name}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Division
            </label>
            <select
              value={division_filter}
              onChange={(e) => set_division_filter(e.target.value)}
              className="block w-full rounded-2xl border border-gray-200 bg-white py-4 px-6 text-sm font-medium shadow-sm ring-1 ring-gray-200 transition-all focus:border-gray-950 focus:outline-none focus:ring-2 focus:ring-gray-950"
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
      <div>
        {!selected_judge_id ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50/50 p-16 text-center ring-1 ring-gray-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <StarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">No judge selected</p>
            <p className="text-sm text-gray-500">Please scan your personal QR code from the Judges page to access your scoring screen.</p>
          </div>
        ) : filtered_cars.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50/50 p-16 text-center ring-1 ring-gray-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <StarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700">No cars to judge in this division</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered_cars.map((car) => {
              const existing_score = getJudgeScoreForCar(car)
              return (
                <div 
                  key={car.id} 
                  className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-gray-300"
                >
                  {/* Car name at top */}
                  <div className="mb-6 flex items-center gap-3">
                    <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">#{car.id}</span>
                    <h3 className="text-lg font-bold text-gray-950">{car.car_name}</h3>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Photo thumbnail */}
                    <button
                      onClick={() => car.photo_hash && set_expanded_photo({ hash: car.photo_hash, name: car.car_name })}
                      className="relative size-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 ring-2 ring-gray-200 transition-all hover:ring-gray-300 hover:scale-105"
                    >
                      {car.photo_hash ? (
                        <Image
                          src={`/photos/${car.photo_hash}.jpg`}
                          alt={car.car_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-medium text-gray-400">
                          No image
                        </div>
                      )}
                    </button>

                    {/* Score buttons */}
                    <div className="flex flex-1 flex-wrap gap-2 justify-end">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                        const is_confirmed = existing_score?.score === score
                        const is_pending = pending_scores[car.id] === score
                        return (
                          <button
                            key={score}
                            onClick={() => handleScore(car.id, score)}
                            className={`size-12 rounded-xl text-sm font-bold transition-all shadow-sm ${
                              is_confirmed
                                ? 'bg-green-600 text-white ring-2 ring-green-700 shadow-md scale-105'
                                : is_pending
                                  ? 'bg-green-400 text-white ring-2 ring-green-500 animate-pulse'
                                  : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-200 hover:ring-gray-300 active:scale-95'
                            }`}
                          >
                            {score}
                          </button>
                        )
                      })}
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
