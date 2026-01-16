'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Car, Heat, Race, RaceState } from '@/lib/storage'
import Image from 'next/image'
import QRCode from 'qrcode'
import { clsx } from 'clsx'

export default function PublicPage() {
  const [race, set_race] = useState<Race | null>(null)
  const [cars, set_cars] = useState<Record<number, Car>>({})
  const [is_loading, set_is_loading] = useState(true)
  const [qr_code_url, set_qr_code_url] = useState<string>('')
  const [local_ip, set_local_ip] = useState<string>('')
  const [active_step, set_active_step] = useState(1)

  const fetchData = async () => {
    try {
      const [race_res, cars_res] = await Promise.all([
        fetch('/api/race').then(res => res.json()),
        fetch('/api/cars').then(res => res.json())
      ])

      const cars_map: Record<number, Car> = {}
      cars_res.forEach((c: Car) => cars_map[c.id] = c)
      set_cars(cars_map)
      set_race(race_res)
      set_local_ip(race_res.local_ip)
      
      if (race_res.state === 'REGISTRATION' && !qr_code_url) {
        const url = `http://${race_res.local_ip}/register`
        const qr = await QRCode.toDataURL(url, { 
          width: 800, 
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        set_qr_code_url(qr)
      }

      set_is_loading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [qr_code_url])

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
    <div className="flex h-screen items-center justify-center bg-gray-950 text-white font-sans">
      <div className="text-4xl font-black animate-pulse tracking-tighter italic">PACK 123</div>
    </div>
  )

  if (race.state === 'REGISTRATION') {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-12 overflow-hidden selection:bg-white/30">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="absolute -top-[10%] -left-[10%] size-[40%] rounded-full bg-white/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] size-[40%] rounded-full bg-white/5 blur-[120px]" />
        
        <div className="relative z-10 w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            {/* Left Column: Instructions */}
            <div className="flex flex-col gap-16">
              <div className="space-y-4">
                <div className="inline-block rounded-full bg-blue-600/10 px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-blue-400 ring-1 ring-blue-600/20">
                  Step-by-Step Guide
                </div>
                <h1 className="text-8xl font-black tracking-tighter uppercase italic leading-[0.9]">
                  Register<br />
                  <span className="text-blue-600">Your Car</span>
                </h1>
              </div>

              <div className="grid gap-12">
                {[
                  { step: 1, title: 'Scan QR Code', desc: 'Point your camera at the screen to start.' },
                  { step: 2, title: 'Enter Info & Photo', desc: 'Add your car details and a cool picture.' },
                  { step: 3, title: 'Official Check-in', desc: 'Bring your vehicle to the scale for weigh-in.' }
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

  // Find current and next heats for RACING state
  const current_idx = race.heats.findIndex((h: Heat) => h.lane_times.some(t => t === null && h.lane_cars.some(car_id => car_id !== null)))
  const current_heat = current_idx !== -1 ? race.heats[current_idx] : (race.heats.length > 0 ? race.heats[race.heats.length - 1] : null)
  const next_heat = current_idx !== -1 && current_idx < race.heats.length - 1 ? race.heats[current_idx + 1] : null

  if (!current_heat) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-4xl font-bold animate-pulse">Waiting for heats to be generated...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Current Heat Main Area */}
      <div className="flex h-[75vh] flex-col p-12">
        <div className="flex items-center justify-between">
          <h1 className="text-6xl font-black tracking-tighter italic text-blue-600">HEAT #{current_heat.id}</h1>
          <div className="text-3xl font-bold text-gray-500 uppercase tracking-widest">Live Results</div>
        </div>

        <div className="mt-12 grid flex-1 grid-cols-1 gap-8 lg:grid-cols-4">
          {current_heat.lane_cars.map((car_id, i) => {
            const car = car_id ? cars[car_id] : null
            return (
              <div key={i} className="flex flex-col rounded-[40px] bg-white/5 p-8 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl">
                <div className="text-2xl font-black text-gray-500 italic uppercase tracking-tighter">Lane {i + 1}</div>
                <div className="mt-4 flex-1">
                  {car ? (
                    <div className="space-y-8">
                      <div className="relative aspect-square overflow-hidden rounded-3xl shadow-inner bg-gray-900/50">
                        {car.photo_hash ? (
                          <Image
                            src={`/photos/${car.photo_hash}.jpg`}
                            alt={car.car_name}
                            fill
                            className="object-cover transition-transform duration-500 hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-8xl font-black text-white/5">
                            ?
                          </div>
                        )}
                        <div className="absolute top-4 left-4 rounded-3xl bg-gray-950/90 px-8 py-4 shadow-2xl backdrop-blur-xl border border-white/10">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none text-center">Car #</div>
                          <div className="text-4xl font-black text-white mt-1 leading-none text-center">{car.id}</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-black truncate tracking-tight">{car.car_name}</div>
                        <div className="mt-1 text-xl font-bold text-gray-500 uppercase tracking-wide">{car.first_name} {car.last_name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl font-black text-white/5 uppercase italic tracking-tighter">Empty Lane</div>
                  )}
                </div>
                <div className="mt-8 text-center">
                  <div className={clsx(
                    "font-mono text-8xl font-black tracking-tighter transition-colors duration-500",
                    current_heat.lane_times[i] ? 'text-green-400' : 'text-white/10'
                  )}>
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
        <div className="h-[25vh] border-t border-white/10 bg-white/5 p-12 backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-16">
            <div className="shrink-0 space-y-1">
              <div className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Coming Up</div>
              <div className="text-5xl font-black italic text-blue-600 tracking-tighter uppercase leading-none">Heat #{next_heat.id}</div>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-12">
              {next_heat.lane_cars.map((car_id, i) => {
                const car = car_id ? cars[car_id] : null
                if (!car) return <div key={i} />
                return (
                  <div key={i} className="flex items-center gap-6 overflow-hidden group">
                    <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-gray-800/50 ring-1 ring-white/10">
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
                      <div className="text-2xl font-black truncate tracking-tight uppercase italic">#{car.id}</div>
                      <div className="text-sm font-bold text-gray-400 uppercase tracking-widest truncate">{car.car_name}</div>
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
