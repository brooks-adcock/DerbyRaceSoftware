'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Link } from '@/components/link'
import { Car } from '@/lib/storage'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'

export default function RegistrationListPage() {
  const [cars, set_cars] = useState<Car[]>([])
  const [search_query, set_search_query] = useState('')
  const [sort_key, set_sort_key] = useState<keyof Car>('id')
  const [sort_order, set_sort_order] = useState<'asc' | 'desc'>('asc')
  const [is_loading, set_is_loading] = useState(true)

  useEffect(() => {
    fetch('/api/cars')
      .then((res) => res.json())
      .then((data) => {
        set_cars(data)
        set_is_loading(false)
      })
  }, [])

  const filtered_cars = cars.filter((car) => {
    const search_text = `${car.id} ${car.first_name} ${car.last_name} ${car.car_name} ${car.scout_level}`.toLowerCase()
    return search_text.includes(search_query.toLowerCase())
  })

  const sorted_cars = [...filtered_cars].sort((a, b) => {
    const a_val = a[sort_key]
    const b_val = b[sort_key]
    
    if (a_val === undefined || b_val === undefined) return 0
    
    if (a_val < b_val) return sort_order === 'asc' ? -1 : 1
    if (a_val > b_val) return sort_order === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (key: keyof Car) => {
    if (sort_key === key) {
      set_sort_order(sort_order === 'asc' ? 'desc' : 'asc')
    } else {
      set_sort_key(key)
      set_sort_order('asc')
    }
  }

  return (
    <Container className="py-24">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Subheading>Admin</Subheading>
          <Heading className="mt-2">Registration List</Heading>
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search cars..."
            value={search_query}
            onChange={(e) => set_search_query(e.target.value)}
            className="rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-gray-950 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-12 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="cursor-pointer pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]" onClick={() => toggleSort('id')}>
                CAR # {sort_key === 'id' && (sort_order === 'asc' ? '↑' : '↓')}
              </th>
              <th className="cursor-pointer pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]" onClick={() => toggleSort('first_name')}>
                OWNER {sort_key === 'first_name' && (sort_order === 'asc' ? '↑' : '↓')}
              </th>
              <th className="cursor-pointer pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]" onClick={() => toggleSort('car_name')}>
                CAR NAME {sort_key === 'car_name' && (sort_order === 'asc' ? '↑' : '↓')}
              </th>
              <th className="cursor-pointer pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]" onClick={() => toggleSort('scout_level')}>
                LEVEL {sort_key === 'scout_level' && (sort_order === 'asc' ? '↑' : '↓')}
              </th>
              <th className="cursor-pointer pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]" onClick={() => toggleSort('registration_status')}>
                STATUS {sort_key === 'registration_status' && (sort_order === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {is_loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  Loading cars...
                </td>
              </tr>
            ) : sorted_cars.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No cars found.
                </td>
              </tr>
            ) : (
              sorted_cars.map((car) => (
                <tr key={car.id} className="group hover:bg-gray-50">
                  <td className="py-4 pr-4">
                    <Link href={`/cars/${car.id}`} className="block font-black text-gray-950 text-lg">
                      #{car.id}
                    </Link>
                  </td>
                  <td className="py-4 pr-4">
                    <Link href={`/cars/${car.id}`} className="block text-gray-600 font-bold group-hover:text-gray-950">
                      {car.first_name} {car.last_name}
                    </Link>
                  </td>
                  <td className="py-4 pr-4">
                    <Link href={`/cars/${car.id}`} className="block text-gray-600 group-hover:text-gray-950">
                      {car.car_name}
                    </Link>
                  </td>
                  <td className="py-4 pr-4 text-gray-600 font-medium">{car.scout_level}</td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      car.registration_status === 'REGISTERED' ? 'bg-green-100 text-green-700' :
                      car.registration_status === 'REVIEW' ? 'bg-blue-100 text-blue-700' :
                      car.registration_status === 'DISQUALIFIED' ? 'bg-red-100 text-red-700' :
                      car.registration_status === 'COURTESY' ? 'bg-purple-100 text-purple-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {car.registration_status === 'STARTED' ? 'Reg. Started' : 
                       car.registration_status === 'REVIEW' ? 'Under Review' : 
                       car.registration_status === 'DISQUALIFIED' ? 'Disqualified' : 
                       car.registration_status === 'COURTESY' ? 'Courtesy Run' : 'Registered'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Container>
  )
}
