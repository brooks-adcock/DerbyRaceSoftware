'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Breadcrumb } from '@/components/breadcrumb'
import { Car, RegistrationStatus, Run, RaceSettings, Judge } from '@/lib/storage'
import { validateCarLanes, formatLaneIssues } from '@/lib/validation'
import { DivisionSelect } from '@/components/division-select'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function CarAdminPage() {
  const { id } = useParams()
  const router = useRouter()
  const [car, set_car] = useState<Car | null>(null)
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [judges, set_judges] = useState<Judge[]>([])
  const [is_loading, set_is_loading] = useState(true)
  const [weight_input, set_weight_input] = useState('')
  const [weight_unit, set_weight_unit] = useState<'oz' | 'g'>('oz')
  const [is_axle_modal_open, set_is_axle_modal_open] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/cars/${id}`).then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/judges').then(res => res.json())
    ]).then(([car_data, settings_data, judges_data]) => {
      set_car(car_data)
      set_settings(settings_data)
      set_judges(judges_data)
      set_weight_input(car_data.weight_oz.toString())
      set_is_loading(false)
    })
  }, [id])

  const getJudgeName = (judge_id: string) => {
    const judge = judges.find(j => j.id === judge_id)
    return judge?.name || 'Unknown'
  }

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
    const new_runs = [...car.runs]
    new_runs[index].is_included = !new_runs[index].is_included
    handleUpdate({ runs: new_runs })
  }

  const toggleBeautyScoreIncluded = (index: number) => {
    if (!car) return
    const new_scores = [...car.beauty_scores]
    new_scores[index].is_included = !new_scores[index].is_included
    handleUpdate({ beauty_scores: new_scores })
  }

  return (
    <Container className="py-24">
      <Breadcrumb href="/registration" label="Registration List" />
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
              <div className="mt-1 text-sm text-gray-500 font-medium">{car.division}</div>
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
                    checked={car.is_wheels_roll ?? false}
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
                    checked={car.is_length_pass ?? false}
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
                    checked={car.is_width_pass ?? false}
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
                    checked={car.is_ground_clearance_pass ?? false}
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
                    checked={car.is_no_loose_parts ?? false}
                    onChange={(e) => handleUpdate({ is_no_loose_parts: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="no_loose_parts" className="text-sm font-medium text-gray-950">
                    No loose parts
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="flat_region_front"
                    checked={car.is_flat_region_front ?? false}
                    onChange={(e) => handleUpdate({ is_flat_region_front: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="flat_region_front" className="text-sm font-medium text-gray-950">
                    1/4" flat region at the front of the car
                  </label>
                </div>
                
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Speed-Only Requirements</div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="axles_precut_slots"
                    checked={car.is_axles_precut_slots ?? false}
                    onChange={(e) => handleUpdate({ is_axles_precut_slots: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="axles_precut_slots" className="text-sm font-medium text-gray-950">
                    Axles use pre-cut slots
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="axles_wheels_bsa"
                    checked={car.is_axles_wheels_bsa ?? false}
                    onChange={(e) => handleUpdate({ is_axles_wheels_bsa: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="axles_wheels_bsa" className="text-sm font-medium text-gray-950 flex items-center gap-2">
                    Axles and wheels are BSA
                    <button
                      type="button"
                      onClick={() => set_is_axle_modal_open(true)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Show axle information"
                    >
                      <InformationCircleIcon className="size-4" />
                    </button>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="wheel_diameter_pass"
                    checked={car.is_wheel_diameter_pass ?? false}
                    onChange={(e) => handleUpdate({ is_wheel_diameter_pass: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="wheel_diameter_pass" className="text-sm font-medium text-gray-950">
                    Wheel diameter &gt;=1.155"
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="dry_powder_lubricant"
                    checked={car.is_dry_powder_lubricant ?? false}
                    onChange={(e) => handleUpdate({ is_dry_powder_lubricant: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="dry_powder_lubricant" className="text-sm font-medium text-gray-950">
                    Dry powder lubricant only
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="no_propulsion"
                    checked={car.is_no_propulsion ?? false}
                    onChange={(e) => handleUpdate({ is_no_propulsion: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="no_propulsion" className="text-sm font-medium text-gray-950">
                    No propulsion
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="no_magnets_glue_front"
                    checked={car.is_no_magnets_glue_front ?? false}
                    onChange={(e) => handleUpdate({ is_no_magnets_glue_front: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="no_magnets_glue_front" className="text-sm font-medium text-gray-950">
                    No magnets/glue on front
                  </label>
                </div>
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
                      car.registration_status === 'REGISTERED_BEAUTY' ? 'border-teal-200 bg-teal-50 text-teal-700' :
                      car.registration_status === 'REVIEW' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                      car.registration_status === 'DISQUALIFIED' ? 'border-red-200 bg-red-50 text-red-700' :
                      car.registration_status === 'COURTESY' ? 'border-purple-200 bg-purple-50 text-purple-700' :
                      'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    <option value="STARTED">Registration Started</option>
                    <option value="REVIEW">Under Review</option>
                    <option value="REGISTERED">Fully Registered</option>
                    <option value="REGISTERED_BEAUTY">Fully Registered - Beauty</option>
                    <option value="COURTESY">Courtesy Run (No Score)</option>
                    <option value="DISQUALIFIED">Disqualified</option>
                  </select>
                </div>

                <div className="rounded-xl border border-gray-200 p-6">
                  <label className="block text-sm font-medium text-gray-950">Division</label>
                  <DivisionSelect
                    value={car.division || ''}
                    divisions={settings?.divisions || []}
                    onChange={(value) => handleUpdate({ division: value })}
                    className="mt-2 text-sm font-bold shadow-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Registrant Choices */}
          <section>
            <Subheading>Registrant Choices</Subheading>
            <div className="mt-6 rounded-xl border border-gray-200 p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_beauty"
                    checked={car.is_beauty ?? false}
                    onChange={(e) => handleUpdate({ is_beauty: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <label htmlFor="is_beauty" className="text-sm font-medium text-gray-950">
                    Consider for Beauty Award
                  </label>
                </div>
                <div>
                  <label htmlFor="win_preference" className="block text-sm font-medium text-gray-950">
                    If they win twice, which award?
                  </label>
                  <select
                    id="win_preference"
                    value={car.win_preference ?? 'speed'}
                    onChange={(e) => handleUpdate({ win_preference: e.target.value as 'beauty' | 'speed' })}
                    className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-950 focus:border-gray-950 focus:outline-none"
                  >
                    <option value="speed">Speed</option>
                    <option value="beauty">Beauty</option>
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
                {settings && car.runs.length > 0 && (() => {
                  const validation = validateCarLanes(car, settings.n_tracks);
                  if (!validation.is_valid) {
                    return (
                      <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                        <span className="font-semibold">Lane Issues: </span>
                        {formatLaneIssues(validation)}
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 font-semibold text-gray-500">Timestamp</th>
                        <th className="pb-3 font-semibold text-gray-500">Lane</th>
                        <th className="pb-3 font-semibold text-gray-500">Time</th>
                        <th className="pb-3 font-semibold text-gray-500">Included</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {car.runs.length > 0 ? (
                        car.runs.map((t, i) => (
                          <tr key={i}>
                            <td className="py-3 text-gray-950 text-sm">{t.timestamp ? new Date(t.timestamp).toLocaleString() : '--'}</td>
                            <td className="py-3 text-gray-950">{t.lane || '--'}</td>
                            <td className="py-3 font-mono text-gray-950">{t.time.toFixed(4)}s</td>
                            <td className="py-3">
                              <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={t.is_included ?? false}
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
                            No runs recorded yet.
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
            <div className="mt-6 space-y-6">
              <div className="rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-950">Beauty Scores</h3>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 font-semibold text-gray-500">Judge</th>
                        <th className="pb-3 font-semibold text-gray-500">Score</th>
                        <th className="pb-3 font-semibold text-gray-500">Included</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {car.beauty_scores.length > 0 ? (
                        car.beauty_scores.map((s, i) => (
                          <tr key={i}>
                            <td className="py-3 text-gray-950">{s.judge_id ? getJudgeName(s.judge_id) : '--'}</td>
                            <td className="py-3 font-mono text-gray-950">{s.score}</td>
                            <td className="py-3">
                              <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={s.is_included ?? false}
                                  onChange={() => toggleBeautyScoreIncluded(i)}
                                  className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                                />
                                {s.is_included ? 'Included' : 'Excluded'}
                              </label>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-500">
                            No beauty scores recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-6">
                  <div className="text-xs font-medium text-gray-500 uppercase">Average Score</div>
                  <div className="mt-1 text-2xl font-bold text-gray-950">
                    {car.average_beauty_score ? car.average_beauty_score.toFixed(1) : '--'}
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
            </div>
          </section>
        </div>
      </div>

      {/* Axle Comparison Modal */}
      <Dialog open={is_axle_modal_open} onClose={() => set_is_axle_modal_open(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-4xl w-full rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <DialogTitle className="text-xl font-bold text-gray-950">BSA vs Machined Axles</DialogTitle>
              <button
                onClick={() => set_is_axle_modal_open(false)}
                className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-950 mb-2">BSA Axle (Legal)</h3>
                <div className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <Image
                    src="/axles/bsa_axle.png"
                    alt="BSA axle"
                    fill
                    className="object-contain"
                    onError={(e) => {
                      // Fallback if image doesn't exist yet
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">BSA Axle Image</div>'
                      }
                    }}
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-950 mb-2">Machined Axle (Not Legal)</h3>
                <div className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <Image
                    src="/axles/machined_axle.png"
                    alt="Machined axle"
                    fill
                    className="object-contain"
                    onError={(e) => {
                      // Fallback if image doesn't exist yet
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">Machined Axle Image</div>'
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Machined axles are not legal for competition. Only BSA axles are permitted.
              </p>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Container>
  )
}
