'use client'

import { useState, useEffect, Suspense } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Car } from '@/lib/storage'

const SCOUT_LEVELS = ['Lion', 'Tiger', 'Wolf', 'Bear', 'Webelos', 'AOL', 'Family']

function RegisterForm() {
  const router = useRouter()
  const search_params = useSearchParams()
  const edit_id = search_params.get('id')

  const [first_name, set_first_name] = useState('')
  const [last_name, set_last_name] = useState('')
  const [car_name, set_car_name] = useState('')
  const [is_beauty, set_is_beauty] = useState(false)
  const [win_preference, set_win_preference] = useState<'beauty' | 'speed'>('speed')
  const [scout_level, set_scout_level] = useState('Wolf')
  const [photo, set_photo] = useState<File | null>(null)
  const [existing_photo_hash, set_existing_photo_hash] = useState('')
  const [is_submitting, set_is_submitting] = useState(false)
  const [race_state, set_race_state] = useState<string>('')
  const [is_loading, set_is_loading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const race_res = await fetch('/api/race')
        const race_data = await race_res.json()
        set_race_state(race_data.state)

        if (edit_id) {
          const car_res = await fetch(`/api/cars/${edit_id}`)
          if (car_res.ok) {
            const car_data: Car = await car_res.json()
            set_first_name(car_data.first_name)
            set_last_name(car_data.last_name)
            set_car_name(car_data.car_name)
            set_is_beauty(car_data.is_beauty)
            set_win_preference(car_data.win_preference)
            set_scout_level(car_data.scout_level)
            set_existing_photo_hash(car_data.photo_hash)
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        set_is_loading(false)
      }
    }

    loadData()
  }, [edit_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (race_state !== 'REGISTRATION') {
      alert('Registration is currently closed.')
      return
    }
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
      const url = edit_id ? `/api/cars/${edit_id}` : '/api/cars'
      const method = edit_id ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        body: form_data,
      })
      
      const data = await response.json()
      if (response.ok) {
        if (!edit_id) {
          // Save to local storage for new registrations
          const my_cars = JSON.parse(localStorage.getItem('my_cars') || '[]')
          if (!my_cars.includes(data.id)) {
            my_cars.push(data.id)
            localStorage.setItem('my_cars', JSON.stringify(my_cars))
          }
        }
        router.push('/')
      } else {
        alert(data.error || 'Failed to save registration')
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred while saving')
    } finally {
      set_is_submitting(false)
    }
  }

  if (is_loading) return <Container className="py-24">Loading...</Container>

  if (race_state !== 'REGISTRATION') {
    return (
      <Container className="py-24 text-center">
        <Heading>Registration Closed</Heading>
        <p className="mt-4 text-gray-600">
          The registration period for this race has ended. Please contact a race official if you need assistance.
        </p>
        <Button href="/" className="mt-8">View My Cars</Button>
      </Container>
    )
  }

  return (
    <Container className="py-24">
      <Subheading>{edit_id ? 'Edit Registration' : 'Registration'}</Subheading>
      <Heading className="mt-2">{edit_id ? `Editing Car #${edit_id}` : 'Enter Your Car Details'}</Heading>

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
          <label className="block text-sm font-medium text-gray-950">
            Car Picture {edit_id && '(optional, leave empty to keep existing)'}
          </label>
          {existing_photo_hash && !photo && (
            <div className="mt-2 relative size-32 rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={`/photos/${existing_photo_hash}.jpg`} 
                alt="Existing car" 
                className="size-full object-cover"
              />
            </div>
          )}
          <div className="mt-2 flex items-center gap-4">
            <input
              type="file"
              id="photo"
              style={{ display: 'none' }}
              accept=".jpg,.jpeg,.png,.heic"
              onChange={(e) => set_photo(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('photo')?.click()}
            >
              {photo ? 'Change Photo' : 'Choose Photo'}
            </Button>
            {photo && <span className="text-sm text-gray-500">{photo.name}</span>}
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/')} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={is_submitting} className="flex-1">
            {is_submitting ? 'Saving...' : (edit_id ? 'Update Registration' : 'Register Car')}
          </Button>
        </div>
      </form>
    </Container>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<Container className="py-24">Loading...</Container>}>
      <RegisterForm />
    </Suspense>
  )
}
