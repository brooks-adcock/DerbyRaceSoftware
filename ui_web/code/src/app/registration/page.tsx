'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Link } from '@/components/link'
import { Breadcrumb } from '@/components/breadcrumb'
import { Car, RaceSettings, RegistrationStatus } from '@/lib/storage'
import { MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid'

const STORAGE_KEY = 'registration_list_filters'

interface FilterState {
  search_query: string
  sort_key: keyof Car
  sort_order: 'asc' | 'desc'
  division_filter: string
  status_filter: RegistrationStatus | ''
}

const ORPHANED_FILTER = '__ORPHANED__'

function loadFilters(): Partial<FilterState> {
  if (typeof window === 'undefined') return {}
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function saveFilters(filters: FilterState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
}

export default function RegistrationListPage() {
  const [cars, set_cars] = useState<Car[]>([])
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [search_query, set_search_query] = useState('')
  const [sort_key, set_sort_key] = useState<keyof Car>('id')
  const [sort_order, set_sort_order] = useState<'asc' | 'desc'>('asc')
  const [is_loading, set_is_loading] = useState(true)
  const [division_filter, set_division_filter] = useState<string>('')
  const [status_filter, set_status_filter] = useState<RegistrationStatus | ''>('')
  const [is_filters_loaded, set_is_filters_loaded] = useState(false)

  // Load filters from localStorage on mount
  useEffect(() => {
    const saved = loadFilters()
    if (saved.search_query !== undefined) set_search_query(saved.search_query)
    if (saved.sort_key !== undefined) set_sort_key(saved.sort_key)
    if (saved.sort_order !== undefined) set_sort_order(saved.sort_order)
    if (saved.division_filter !== undefined) set_division_filter(saved.division_filter)
    if (saved.status_filter !== undefined) set_status_filter(saved.status_filter)
    set_is_filters_loaded(true)
  }, [])

  // Save filters to localStorage when they change
  useEffect(() => {
    if (!is_filters_loaded) return
    saveFilters({
      search_query,
      sort_key,
      sort_order,
      division_filter,
      status_filter,
    })
  }, [search_query, sort_key, sort_order, division_filter, status_filter, is_filters_loaded])

  useEffect(() => {
    Promise.all([
      fetch('/api/cars').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([cars_data, settings_data]) => {
      set_cars(cars_data)
      set_settings(settings_data)
      set_is_loading(false)
    })
  }, [])

  const isOrphanedDivision = (division: string) => {
    if (!settings?.divisions) return false
    return !settings.divisions.includes(division)
  }

  const filtered_cars = cars.filter((car) => {
    const search_text = `${car.id} ${car.first_name} ${car.last_name} ${car.car_name} ${car.division}`.toLowerCase()
    const matches_search = search_text.includes(search_query.toLowerCase())
    const matches_division = !division_filter || 
      (division_filter === ORPHANED_FILTER ? isOrphanedDivision(car.division) : car.division === division_filter)
    const matches_status = !status_filter || car.registration_status === status_filter
    return matches_search && matches_division && matches_status
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
      <Breadcrumb />
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Subheading>Admin</Subheading>
          <Heading className="mt-2">Registration List</Heading>
        </div>
        {is_filters_loaded && (
          <div className="flex items-center gap-4">
            <select
              value={division_filter}
              onChange={(e) => set_division_filter(e.target.value)}
              className="rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-950 focus:outline-none"
            >
              <option value="">All Divisions</option>
              <option value={ORPHANED_FILTER}>Orphaned Only</option>
              {settings?.divisions?.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={status_filter}
              onChange={(e) => set_status_filter(e.target.value as RegistrationStatus | '')}
              className="rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-gray-950 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="STARTED">Reg. Started</option>
              <option value="REVIEW">Under Review</option>
              <option value="REGISTERED">Registered</option>
              <option value="DISQUALIFIED">Disqualified</option>
              <option value="COURTESY">Courtesy Run</option>
            </select>
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
        )}
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
              <th className="cursor-pointer pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]" onClick={() => toggleSort('division')}>
                DIVISION {sort_key === 'division' && (sort_order === 'asc' ? '↑' : '↓')}
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
              sorted_cars.map((car) => {
                const is_orphaned = isOrphanedDivision(car.division)
                return (
                  <tr key={car.id} className={`group ${is_orphaned ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
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
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        {is_orphaned && <ExclamationTriangleIcon className="size-4 text-amber-500" />}
                        <span className={`font-medium ${is_orphaned ? 'text-amber-700' : 'text-gray-600'}`}>{car.division}</span>
                      </div>
                    </td>
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
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Container>
  )
}
