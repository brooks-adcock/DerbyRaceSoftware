'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import type { Car, Heat, Race, RaceState, RaceSettings } from '@/lib/storage'
import { CountdownOverlay } from '@/components/countdown-overlay'
import Image from 'next/image'
import QRCode from 'qrcode'
import { clsx } from 'clsx'

export default function PublicPage() {
  const [race, set_race] = useState<Race | null>(null)
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [cars, set_cars] = useState<Record<number, Car>>({})
  const [is_loading, set_is_loading] = useState(true)
  const [qr_code_url, set_qr_code_url] = useState<string>('')
  const [local_ip, set_local_ip] = useState<string>('')
  const [active_step, set_active_step] = useState(1)

  const fetchData = async () => {
    try {
      const [race_res, cars_res, settings_res] = await Promise.all([
        fetch('/api/race').then(res => res.json()),
        fetch('/api/cars').then(res => res.json()),
        fetch('/api/settings').then(res => res.json())
      ])

      const cars_map: Record<number, Car> = {}
      cars_res.forEach((c: Car) => cars_map[c.id] = c)
      set_cars(cars_map)
      set_race(race_res)
      set_settings(settings_res)
      // Regenerate QR if IP changed
      if (race_res.state === 'REGISTRATION' && race_res.local_ip !== local_ip) {
        set_local_ip(race_res.local_ip)
        const url = `http://${race_res.local_ip}/`
        const qr = await QRCode.toDataURL(url, { 
          width: 800, 
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        set_qr_code_url(qr)
      } else if (!local_ip) {
        set_local_ip(race_res.local_ip)
      }

      set_is_loading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (race?.state === 'REGISTRATION') {
      const sequence = [
        { step: 1, duration: 2000 },
        { step: 0, duration: 1000 }, // 1 sec pause between steps
        { step: 2, duration: 2000 },
        { step: 0, duration: 1000 }, // 1 sec pause between steps
        { step: 3, duration: 2000 },
        { step: 0, duration: 3000 }, // 3 sec pause between cycles
      ]
      let current_index = 0
      let timeout_id: NodeJS.Timeout

      const runSequence = () => {
        set_active_step(sequence[current_index].step)
        timeout_id = setTimeout(() => {
          current_index = (current_index + 1) % sequence.length
          runSequence()
        }, sequence[current_index].duration)
      }

      runSequence()
      return () => clearTimeout(timeout_id)
    }
  }, [race?.state])

  if (is_loading || !race) return (
    <div className="flex h-screen items-center justify-center bg-black text-white font-sans">
      <div className="text-4xl font-black animate-pulse tracking-tighter italic">PACK 451</div>
    </div>
  )

  if (race.state === 'REGISTRATION') {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-black text-white p-12 overflow-hidden selection:bg-white/30">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_50%)]" />
        <div className="absolute -top-[10%] -left-[10%] size-[40%] rounded-full bg-neutral-500/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] size-[40%] rounded-full bg-neutral-500/5 blur-[120px]" />
        
        <div className="relative z-10 w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            {/* Left Column: Instructions */}
            <div className="flex flex-col gap-16">
              <div className="space-y-4">
                <h1 className="text-8xl font-black tracking-tighter uppercase italic leading-[0.9]">
                  Register<br />
                  <span className="text-blue-600">Your Car</span>
                </h1>
                
                <div className="inline-block rounded-2xl bg-white/5 px-6 py-4 ring-1 ring-white/10 backdrop-blur-xl mt-6 shadow-2xl">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-3xl font-black italic tracking-tighter text-white leading-none">PACK 451</span>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-500/60 leading-none mb-2">Pinewood Derby</span>
                      <span className="text-3xl font-black italic tracking-tighter text-blue-600 leading-none">2026</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-12">
                {[
                  { step: 1, title: 'Scan QR Code', desc: 'Point your camera at the screen to start.' },
                  { step: 2, title: 'Enter Info & Photo', desc: 'Add your car details and a cool picture.' },
                  { step: 3, title: 'Official Check-in', desc: 'Bring your vehicle to the registration table.' }
                ].map((item) => (
                  <div 
                    key={item.step} 
                    className={clsx(
                      "flex gap-8 items-start transition-all duration-500",
                      active_step === item.step ? "scale-105" : "opacity-40 grayscale-[0.5]"
                    )}
                  >
                    <div className={clsx(
                      "flex size-16 shrink-0 items-center justify-center rounded-2xl text-4xl font-black ring-1 transition-all duration-500",
                      active_step === item.step 
                        ? "bg-blue-600 text-white ring-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.4)]" 
                        : "bg-white/5 text-blue-600 ring-white/10"
                    )}>
                      {item.step}
                    </div>
                    <div className="space-y-2">
                      <h2 className={clsx(
                        "text-3xl font-bold tracking-tight transition-colors duration-500",
                        active_step === item.step ? "text-white" : "text-gray-500"
                      )}>
                        {item.title}
                      </h2>
                      <p className={clsx(
                        "text-xl font-medium leading-relaxed transition-colors duration-500",
                        active_step === item.step ? "text-gray-300" : "text-gray-600"
                      )}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: QR Code */}
            <div className="flex flex-col items-center justify-center gap-12">
              <div className="group relative p-4 transition-transform hover:scale-[1.02]">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-[48px] bg-white blur-[60px] opacity-10 transition-opacity group-hover:opacity-20" />
                
                <div className="relative overflow-hidden rounded-[40px] bg-white p-12 shadow-2xl">
                  {qr_code_url && (
                    <img 
                      src={qr_code_url} 
                      alt="Registration QR Code" 
                      className="size-[500px] object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">Manual Entry</div>
                <div className="text-5xl font-mono font-black tracking-tight text-white bg-white/5 px-8 py-3 rounded-2xl ring-1 ring-white/10">
                  http://{local_ip}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (settings?.presentation?.is_visible && race.state !== 'RACING') {
    const level = settings.presentation.scout_level
    const type = settings.presentation.type
    
    const results = Object.values(cars)
      .filter(c => {
        if (level !== 'Overall' && c.scout_level !== level) return false
        if (type === 'speed') return (c.average_time || 0) > 0
        return c.beauty_scores.length > 0
      })
      .sort((a, b) => {
        if (type === 'speed') {
          return (a.average_time || 999) - (b.average_time || 999)
        } else {
          const a_avg = a.beauty_scores.length > 0 ? a.beauty_scores.reduce((sum, s) => sum + s, 0) / a.beauty_scores.length : 0
          const b_avg = b.beauty_scores.length > 0 ? b.beauty_scores.reduce((sum, s) => sum + s, 0) / b.beauty_scores.length : 0
          return b_avg - a_avg
        }
      })
      .slice(0, 3)

    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-black text-white p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_50%)]" />
        
        <div className="relative z-10 w-full max-w-7xl text-center space-y-16">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-[0.2em] text-blue-600 uppercase italic">
              {level} Results
            </h1>
            <div className="text-xl md:text-2xl font-bold text-gray-500 uppercase tracking-widest">
              {type === 'speed' ? 'Fastest Cars' : 'Best in Show'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
            {/* 2nd Place */}
            {results[1] && (
              <div className="flex flex-col items-center gap-6 order-2 md:order-1">
                <div className="relative size-48 md:size-64 rounded-3xl overflow-hidden ring-4 ring-gray-400/30">
                  {results[1].photo_hash ? (
                    <Image src={`/photos/${results[1].photo_hash}.jpg`} alt={results[1].car_name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-900 text-6xl font-black text-white/5">?</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-black">#{results[1].id} {results[1].car_name}</div>
                  <div className="text-sm font-bold text-gray-500 uppercase">{results[1].first_name} {results[1].last_name}</div>
                  <div className="space-y-1">
                    <div className="inline-block px-6 py-2 rounded-full bg-gray-400 text-black font-black italic uppercase tracking-tighter">2nd Place</div>
                    {type === 'speed' && <div className="text-xl font-mono text-gray-400 font-black tracking-tighter">{results[1].average_time?.toFixed(4)}s</div>}
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {results[0] && (
              <div className="flex flex-col items-center gap-8 order-1 md:order-2 pb-12">
                <div className="relative size-64 md:size-96 rounded-[48px] overflow-hidden ring-8 ring-yellow-400 shadow-[0_0_100px_rgba(250,204,21,0.2)]">
                  {results[0].photo_hash ? (
                    <Image src={`/photos/${results[0].photo_hash}.jpg`} alt={results[0].car_name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-900 text-8xl font-black text-white/5">?</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="text-4xl md:text-5xl font-black tracking-tighter italic">#{results[0].id} {results[0].car_name}</div>
                  <div className="text-xl font-bold text-gray-400 uppercase">{results[0].first_name} {results[0].last_name}</div>
                  <div className="space-y-2">
                    <div className="inline-block px-12 py-4 rounded-full bg-yellow-400 text-black text-2xl font-black italic uppercase tracking-tighter shadow-[0_0_30px_rgba(250,204,21,0.4)]">1st Place</div>
                    {type === 'speed' && <div className="text-3xl font-mono text-yellow-400/80 font-black tracking-tighter">{results[0].average_time?.toFixed(4)}s</div>}
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {results[2] && (
              <div className="flex flex-col items-center gap-6 order-3">
                <div className="relative size-40 md:size-56 rounded-3xl overflow-hidden ring-4 ring-orange-400/30">
                  {results[2].photo_hash ? (
                    <Image src={`/photos/${results[2].photo_hash}.jpg`} alt={results[2].car_name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-900 text-6xl font-black text-white/5">?</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xl font-black">#{results[2].id} {results[2].car_name}</div>
                  <div className="text-sm font-bold text-gray-500 uppercase">{results[2].first_name} {results[2].last_name}</div>
                  <div className="space-y-1">
                    <div className="inline-block px-6 py-2 rounded-full bg-orange-400 text-black font-black italic uppercase tracking-tighter">3rd Place</div>
                    {type === 'speed' && <div className="text-xl font-mono text-orange-400/50 font-black tracking-tighter">{results[2].average_time?.toFixed(4)}s</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Find current and next heats for RACING state
  const current_idx = race.current_heat_id !== null 
    ? race.heats.findIndex(h => h.id === race.current_heat_id)
    : race.heats.findIndex((h: Heat) => h.lanes.some(l => l.time === null && l.car_id !== null))
  
  const current_heat = current_idx !== -1 ? race.heats[current_idx] : (race.heats.length > 0 ? race.heats[race.heats.length - 1] : null)
  const next_heat = current_idx !== -1 && current_idx < race.heats.length - 1 ? race.heats[current_idx + 1] : null

  if (race.state === 'COMPLETE' && !settings?.presentation?.is_visible) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white p-12 overflow-hidden selection:bg-white/30">
        <div className="text-center space-y-8">
          <div className="inline-block rounded-2xl bg-white/5 px-6 py-4 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-6">
              <span className="text-3xl font-black italic tracking-tighter text-white">PACK 451</span>
              <div className="h-10 w-px bg-white/10" />
              <span className="text-3xl font-black italic tracking-tighter text-blue-600">RACE COMPLETE</span>
            </div>
          </div>
          <h1 className="text-8xl font-black tracking-tighter uppercase italic leading-[0.9]">
            Stay Tuned for<br />
            <span className="text-blue-600">Results</span>
          </h1>
        </div>
      </div>
    )
  }

  if (!current_heat) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-4xl font-bold animate-pulse">Waiting for heats to be generated...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white">
      <CountdownOverlay countdown_end={race.countdown_end} />
      {/* Current Heat Main Area */}
      <div className="flex h-[72vh] flex-col p-4 md:p-8 lg:p-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter italic text-blue-600">HEAT #{current_heat.id}</h1>
          <div className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-500 uppercase tracking-widest">Live Results</div>
        </div>

        <div className="mt-4 md:mt-8 grid flex-1 grid-cols-2 gap-4 md:gap-8 lg:grid-cols-4 min-h-0">
          {current_heat.lanes.map((lane, i) => {
            const car = lane.car_id ? cars[lane.car_id] : null
            return (
              <div key={i} className="flex flex-col rounded-2xl md:rounded-[40px] bg-white/5 p-4 md:p-8 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl min-h-0">
                <div className="text-lg md:text-2xl font-black text-gray-500 italic uppercase tracking-tighter">Lane {i + 1}</div>
                <div className="mt-2 md:mt-4 flex-1 min-h-0">
                  {car ? (
                    <div className="flex flex-col h-full space-y-2 md:space-y-8">
                      <div className="relative flex-1 min-h-0 overflow-hidden rounded-xl md:rounded-3xl shadow-inner bg-gray-900/50">
                        {car.photo_hash ? (
                          <Image
                            src={`/photos/${car.photo_hash}.jpg`}
                            alt={car.car_name}
                            fill
                            className="object-cover transition-transform duration-500 hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-6xl md:text-8xl font-black text-white/5">
                            ?
                          </div>
                        )}
                        <div className="absolute top-2 left-2 md:top-4 md:left-4 rounded-xl md:rounded-3xl bg-neutral-900/90 px-4 py-2 md:px-8 md:py-4 shadow-2xl backdrop-blur-xl border border-white/10">
                          <div className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none text-center">Car #</div>
                          <div className="text-2xl md:text-4xl font-black text-white mt-1 leading-none text-center">{car.id}</div>
                        </div>
                      </div>
                      <div className="text-center shrink-0">
                        <div className="text-xl md:text-4xl font-black truncate tracking-tight">{car.car_name}</div>
                        <div className="mt-0.5 md:mt-1 text-sm md:text-xl font-bold text-gray-500 uppercase tracking-wide">{car.first_name} {car.last_name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl md:text-4xl font-black text-white/5 uppercase italic tracking-tighter text-center">Empty Lane</div>
                  )}
                </div>
                <div className="mt-4 md:mt-8 text-center shrink-0">
                  <div className={clsx(
                    "font-mono text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter transition-colors duration-500",
                    lane.time && (!race.countdown_end || Date.now() > race.countdown_end) ? 'text-green-400' : 'text-white/10'
                  )}>
                    {lane.time && (!race.countdown_end || Date.now() > race.countdown_end) ? lane.time?.toFixed(3) : '0.000'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Next Heat Footer */}
      {next_heat && (
        <div className="h-[28vh] border-t border-white/10 bg-white/5 p-4 md:p-8 lg:p-12 backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-16 h-full">
            <div className="shrink-0 space-y-0.5 lg:space-y-1">
              <div className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Coming Up</div>
              <div className="text-2xl md:text-4xl lg:text-5xl font-black italic text-blue-600 tracking-tighter uppercase leading-none">Heat #{next_heat.id}</div>
            </div>
            <div className="grid flex-1 grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-12 min-h-0 overflow-hidden">
              {next_heat.lanes.map((lane, i) => {
                const car = lane.car_id ? cars[lane.car_id] : null
                if (!car) return <div key={i} />
                return (
                  <div key={i} className="flex items-center gap-3 md:gap-6 overflow-hidden group min-h-0">
                    <div className="size-12 md:size-20 lg:size-24 shrink-0 overflow-hidden rounded-lg md:rounded-2xl bg-gray-800/50 ring-1 ring-white/10">
                      {car.photo_hash && (
                        <Image
                          src={`/photos/${car.photo_hash}.jpg`}
                          alt={car.car_name}
                          width={96}
                          height={96}
                          className="size-full object-cover grayscale opacity-50 transition-all group-hover:grayscale-0 group-hover:opacity-100"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg md:text-2xl font-black truncate tracking-tight uppercase italic">#{car.id}</div>
                      <div className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest truncate">{car.car_name}</div>
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
