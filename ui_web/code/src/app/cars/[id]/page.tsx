'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Car, RegistrationStatus, TrackTime } from '@/lib/storage'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export default function CarAdminPage() {
  const { id } = useParams()
  const router = useRouter()
  const [car, set_car] = useState<Car | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [weight_input, set_weight_input] = useState('')
  const [weight_unit, set_weight_unit] = useState<'oz' | 'g'>('oz')

  useEffect(() => {
    fetch(`/api/cars/${id}`)
      .then((res) => res.json())
      .then((data) => {
        set_car(data)
        set_weight_input(data.weight_oz.toString())
        set_is_loading(false)
      })
  }, [id])

  if (is_loading) return <Container className="py-24">Loading...</Container>
  if (!car) return <Container className="py-24">Car not found</Container>

  const handleUpdate = async (updates: Partial<Car>) => {
    try {
      const response = await fetch(`/api/cars/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const updated_car = await response.json()
      set_car(updated_car)
    } catch (error) {
      console.error(error)
      alert('Failed to update car')
    }
  }

  const handleWeightChange = (val: string) => {
    set_weight_input(val)
    const num_val = parseFloat(val)
    if (!isNaN(num_val)) {
      const weight_oz = weight_unit === 'g' ? num_val / 28.3495 : num_val
      handleUpdate({ weight_oz })
    }
  }

  const toggleWeightUnit = () => {
    const new_unit = weight_unit === 'oz' ? 'g' : 'oz'
    set_weight_unit(new_unit)
    if (car) {
      const new_val = new_unit === 'g' ? car.weight_oz * 28.3495 : car.weight_oz
      set_weight_input(new_val.toFixed(2))
    }
  }

  const toggleTimeIncluded = (index: number) => {
    if (!car) return
    const new_times = [...car.track_times]
    new_times[index].is_included = !new_times[index].is_included
    handleUpdate({ track_times: new_times })
  }

  return (
    <Container className="py-24">
      <div className="flex flex-col gap-12 lg:flex-row">
        <div className="lg:w-1/3">
          <Subheading>Admin Control</Subheading>
          <div className="mt-4 inline-block rounded-2xl bg-gray-950 p-6 text-white shadow-xl">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Car Number</div>
            <div className="text-6xl font-black mt-2">#{car.id}</div>
          </div>
          <Heading className="mt-8">{car.car_name}</Heading>
          
          {car.photo_hash && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              <Image
                src={`/photos/${car.photo_hash}.jpg`}
                alt={car.car_name}
                width={800}
                height={600}
                className="w-full object-cover"
              />
            </div>
          )}

          <div className="mt-8 space-y-4">
            <div className="rounded-xl bg-gray-50 p-6">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Owner</div>
              <div className="mt-2 text-xl font-bold text-gray-950">
                {car.first_name} {car.last_name}
              </div>
              <div className="mt-1 text-sm text-gray-500 font-medium">{car.scout_level} Level</div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-12">
          {/* Inspection Section */}
          <section>
            <Subheading>Inspection</Subheading>
            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
              {/* Left Column: Rules Checklist */}
              <div className="space-y-4 rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="wheels_roll"
                    checked={car.is_wheels_roll}
                    onChange={(e) => handleUpdate({ is_wheels_roll: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="wheels_roll" className="text-sm font-medium text-gray-950">
                    4 wheels roll
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="length_pass"
                    checked={car.is_length_pass}
                    onChange={(e) => handleUpdate({ is_length_pass: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="length_pass" className="text-sm font-medium text-gray-950">
                    Length passes
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="width_pass"
                    checked={car.is_width_pass}
                    onChange={(e) => handleUpdate({ is_width_pass: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="width_pass" className="text-sm font-medium text-gray-950">
                    Width passes
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ground_clearance_pass"
                    checked={car.is_ground_clearance_pass}
                    onChange={(e) => handleUpdate({ is_ground_clearance_pass: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="ground_clearance_pass" className="text-sm font-medium text-gray-950">
                    Ground clearance
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="no_loose_parts"
                    checked={car.is_no_loose_parts}
                    onChange={(e) => handleUpdate({ is_no_loose_parts: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="no_loose_parts" className="text-sm font-medium text-gray-950">
                    No loose parts
                  </label>
                </div>
              </div>

              {/* Right Column: Weight and Status */}
              <div className="space-y-8">
                <div className="rounded-xl border border-gray-200 p-6">
                  <label className="block text-sm font-medium text-gray-950">Weight</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={weight_input}
                      onChange={(e) => handleWeightChange(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
                    />
                    <button
                      onClick={toggleWeightUnit}
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                    >
                      {weight_unit}
                    </button>
                  </div>
                  {car.weight_oz > 5 && (
                    <p className="mt-2 text-xs font-medium text-red-600">Warning: Over 5oz limit!</p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-6">
                  <label className="block text-sm font-medium text-gray-950">Registration Status</label>
                  <select
                    value={car.registration_status}
                    onChange={(e) => handleUpdate({ registration_status: e.target.value as RegistrationStatus })}
                    className={`mt-2 block w-full rounded-lg border px-4 py-2 text-sm font-bold focus:outline-none shadow-sm transition-colors ${
                      car.registration_status === 'REGISTERED' ? 'border-green-200 bg-green-50 text-green-700' :
                      car.registration_status === 'REVIEW' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                      car.registration_status === 'DISQUALIFIED' ? 'border-red-200 bg-red-50 text-red-700' :
                      car.registration_status === 'COURTESY' ? 'border-purple-200 bg-purple-50 text-purple-700' :
                      'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    <option value="STARTED">Registration Started</option>
                    <option value="REVIEW">Under Review</option>
                    <option value="REGISTERED">Fully Registered</option>
                    <option value="COURTESY">Courtesy Run (No Score)</option>
                    <option value="DISQUALIFIED">Disqualified</option>
                  </select>
                </div>

                <div className="rounded-xl border border-gray-200 p-6">
                  <label className="block text-sm font-medium text-gray-950">Category</label>
                  <select
                    value={car.scout_level}
                    onChange={(e) => handleUpdate({ scout_level: e.target.value })}
                    className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-950 focus:border-gray-950 focus:outline-none shadow-sm"
                  >
                    <option value="Lion/Tiger">Lion/Tiger</option>
                    <option value="Older Scouts">Older Scouts</option>
                    <option value="Family">Family</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Race Stats Section */}
          <section>
            <Subheading>Race Performance</Subheading>
            <div className="mt-6 space-y-6">
              <div className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-950">Track Times</h3>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 font-semibold text-gray-500">Heat ID</th>
                        <th className="pb-3 font-semibold text-gray-500">Track #</th>
                        <th className="pb-3 font-semibold text-gray-500">Time</th>
                        <th className="pb-3 font-semibold text-gray-500">Included</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {car.track_times.length > 0 ? (
                        car.track_times.map((t, i) => (
                          <tr key={i}>
                            <td className="py-3 text-gray-950">{t.heat_id || '--'}</td>
                            <td className="py-3 text-gray-950">{t.track_number || '--'}</td>
                            <td className="py-3 font-mono text-gray-950">{t.time.toFixed(4)}s</td>
                            <td className="py-3">
                              <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={t.is_included}
                                  onChange={() => toggleTimeIncluded(i)}
                                  className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                                />
                                {t.is_included ? 'Included' : 'Excluded'}
                              </label>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            No track times recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-6">
                  <div className="text-xs font-medium text-gray-500 uppercase">Average Time</div>
                  <div className="mt-1 text-2xl font-bold text-gray-950">
                    {car.average_time ? car.average_time.toFixed(4) : '--.----'}s
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-6">
                  <div className="text-xs font-medium text-gray-500 uppercase">Overall Place</div>
                  <div className="mt-1 text-2xl font-bold text-gray-950">
                    {car.overall_place || '--'}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-6">
                  <div className="text-xs font-medium text-gray-500 uppercase">Class Place</div>
                  <div className="mt-1 text-2xl font-bold text-gray-950">
                    {car.class_place || '--'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Beauty Section */}
          <section>
            <Subheading>Beauty Judging</Subheading>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-6">
                <div className="text-xs font-medium text-gray-500 uppercase">Scores</div>
                <div className="mt-1 text-lg font-bold text-gray-950">
                  {car.beauty_scores.length > 0 ? car.beauty_scores.join(', ') : 'None'}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-6">
                <div className="text-xs font-medium text-gray-500 uppercase">Beauty Place</div>
                <div className="mt-1 text-2xl font-bold text-gray-950">
                  {car.beauty_place_overall || '--'}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-6">
                <div className="text-xs font-medium text-gray-500 uppercase">Beauty Class Place</div>
                <div className="mt-1 text-2xl font-bold text-gray-950">
                  {car.beauty_place_class || '--'}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Container>
  )
}
