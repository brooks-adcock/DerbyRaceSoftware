'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { useRouter } from 'next/navigation'

const SCOUT_LEVELS = ['Lion', 'Tiger', 'Wolf', 'Bear', 'Webelos', 'AOL', 'Family']

export default function RegisterPage() {
  const router = useRouter()
  const [first_name, set_first_name] = useState('')
  const [last_name, set_last_name] = useState('')
  const [car_name, set_car_name] = useState('')
  const [is_beauty, set_is_beauty] = useState(false)
  const [win_preference, set_win_preference] = useState<'beauty' | 'speed'>('speed')
  const [scout_level, set_scout_level] = useState('Wolf')
  const [photo, set_photo] = useState<File | null>(null)
  const [is_submitting, set_is_submitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    set_is_submitting(true)

    const form_data = new FormData()
    form_data.append('first_name', first_name)
    form_data.append('last_name', last_name)
    form_data.append('car_name', car_name)
    form_data.append('is_beauty', String(is_beauty))
    form_data.append('win_preference', win_preference)
    form_data.append('scout_level', scout_level)
    if (photo) {
      form_data.append('photo', photo)
    }

    try {
      const response = await fetch('/api/cars', {
        method: 'POST',
        body: form_data,
      })
      const data = await response.json()
      if (response.ok) {
        // Save to local storage
        const my_cars = JSON.parse(localStorage.getItem('my_cars') || '[]')
        if (!my_cars.includes(data.id)) {
          my_cars.push(data.id)
          localStorage.setItem('my_cars', JSON.stringify(my_cars))
        }
        router.push('/')
      } else {
        alert(data.error || 'Failed to register')
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred during registration')
    } finally {
      set_is_submitting(false)
    }
  }

  return (
    <Container className="py-24">
      <Subheading>Registration</Subheading>
      <Heading className="mt-2">Enter Your Car Details</Heading>

      <form onSubmit={handleSubmit} className="mt-12 max-w-xl space-y-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-950">
              First Name
            </label>
            <input
              type="text"
              id="first_name"
              required
              value={first_name}
              onChange={(e) => set_first_name(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-950">
              Last Name
            </label>
            <input
              type="text"
              id="last_name"
              required
              value={last_name}
              onChange={(e) => set_last_name(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="car_name" className="block text-sm font-medium text-gray-950">
            Car Name
          </label>
          <input
            type="text"
            id="car_name"
            required
            value={car_name}
            onChange={(e) => set_car_name(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="scout_level" className="block text-sm font-medium text-gray-950">
            Cub Scout Level
          </label>
          <select
            id="scout_level"
            value={scout_level}
            onChange={(e) => set_scout_level(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
          >
            {SCOUT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_beauty"
            checked={is_beauty}
            onChange={(e) => set_is_beauty(e.target.checked)}
            className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
          />
          <label htmlFor="is_beauty" className="text-sm font-medium text-gray-950">
            Consider for Beauty Award
          </label>
        </div>

        <div>
          <label htmlFor="win_preference" className="block text-sm font-medium text-gray-950">
            If you win twice, which award do you want?
          </label>
          <select
            id="win_preference"
            value={win_preference}
            onChange={(e) => set_win_preference(e.target.value as 'beauty' | 'speed')}
            className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-950 focus:border-gray-950 focus:outline-none"
          >
            <option value="speed">Speed</option>
            <option value="beauty">Beauty</option>
          </select>
        </div>

        <div>
          <label htmlFor="photo" className="block text-sm font-medium text-gray-950">
            Car Picture
          </label>
          <input
            type="file"
            id="photo"
            accept="image/*"
            onChange={(e) => set_photo(e.target.files?.[0] || null)}
            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-gray-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-800"
          />
        </div>

        <Button type="submit" disabled={is_submitting} className="w-full">
          {is_submitting ? 'Registering...' : 'Register Car'}
        </Button>
      </form>
    </Container>
  )
}
