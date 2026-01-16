'use client'

import { useEffect, useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { Container } from '@/components/container'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { useRouter } from 'next/navigation'

interface Race {
  id: string
  name: string
  date: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888'

export default function RacesPage() {
  const router = useRouter()
  const [races, set_races] = useState<Race[]>([])
  const [is_modal_open, set_is_modal_open] = useState(false)
  const [new_race_name, set_new_race_name] = useState('')
  const [new_race_date, set_new_race_date] = useState('')
  const [is_loading, set_is_loading] = useState(true)

  const fetchRaces = async () => {
    try {
      const response = await fetch(`${API_URL}/api/races`)
      if (response.ok) {
        const data = await response.json()
        set_races(data)
      }
    } catch (error) {
      console.error('Failed to fetch races:', error)
    } finally {
      set_is_loading(false)
    }
  }

  useEffect(() => {
    fetchRaces()
  }, [])

  const handleAddRace = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/races`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: new_race_name, date: new_race_date }),
      })
      if (response.ok) {
        set_is_modal_open(false)
        set_new_race_name('')
        set_new_race_date('')
        fetchRaces()
      }
    } catch (error) {
      console.error('Failed to add race:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 py-16">
        <Container>
          <div className="flex items-center justify-between">
            <div>
              <Heading as="h1">Races</Heading>
              <Subheading className="mt-2">
                Manage your upcoming and past races.
              </Subheading>
            </div>
            <Button onClick={() => set_is_modal_open(true)} className="flex items-center gap-2">
              <PlusIcon className="size-5" />
              Add Race
            </Button>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Race Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {is_loading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : races.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                      No races found. Click "Add Race" to create one.
                    </td>
                  </tr>
                ) : (
                  races.map((race) => (
                    <tr
                      key={race.id}
                      onClick={() => router.push(`/races/${race.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {race.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {race.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Container>
      </main>

      <Transition show={is_modal_open} as={Fragment}>
        <Dialog onClose={() => set_is_modal_open(false)} className="relative z-50">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div>
                    <DialogTitle as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Add New Race
                    </DialogTitle>
                    <form onSubmit={handleAddRace} className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Race Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={new_race_name}
                          onChange={(e) => set_new_race_name(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                      </div>
                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                          Race Date
                        </label>
                        <input
                          type="date"
                          id="date"
                          required
                          value={new_race_date}
                          onChange={(e) => set_new_race_date(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                      </div>
                      <div className="mt-5 sm:mt-6 flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => set_is_modal_open(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          Create Race
                        </Button>
                      </div>
                    </form>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Footer />
    </div>
  )
}
