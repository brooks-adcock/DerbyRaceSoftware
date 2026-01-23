'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Link } from '@/components/link'
import type { RaceState } from '@/lib/storage'
import { 
  ClipboardDocumentListIcon, 
  Cog6ToothIcon, 
  PlayIcon, 
  StarIcon, 
  TrophyIcon, 
  TvIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'

const admin_links = [
  {
    name: 'Registration List',
    description: 'View and manage all registered cars and their status.',
    href: '/registration',
    icon: ClipboardDocumentListIcon,
  },
  {
    name: 'Race Setup',
    description: 'Configure tracks, calibrate gates, and test sensors.',
    href: '/setup',
    icon: Cog6ToothIcon,
  },
  {
    name: 'Heat Control',
    description: 'Generate heats and manage live race timing.',
    href: '/heats',
    icon: PlayIcon,
  },
  {
    name: 'Judges',
    description: 'Manage judges and generate QR codes for beauty judging.',
    href: '/judges',
    icon: StarIcon,
  },
  {
    name: 'Standings',
    description: 'View speed and beauty leaderboards.',
    href: '/standings',
    icon: ChartBarIcon,
  },
  {
    name: 'Results',
    description: 'View final standings and present winners.',
    href: '/results',
    icon: TrophyIcon,
  },
  {
    name: 'Public Display',
    description: 'Open the big-screen display for the audience.',
    href: '/public',
    icon: TvIcon,
  },
]

export default function AdminDashboard() {
  const [race_state, set_race_state] = useState<RaceState>('REGISTRATION')
  const [is_loading, set_is_loading] = useState(true)

  useEffect(() => {
    fetch('/api/race')
      .then(res => res.json())
      .then(data => {
        set_race_state(data.state)
        set_is_loading(false)
      })
  }, [])

  const [error_message, set_error_message] = useState<string | null>(null)

  const handleUpdateState = async (new_state: RaceState) => {
    try {
      set_error_message(null)
      const response = await fetch('/api/race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_state', state: new_state }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        set_error_message(data.error || 'Failed to update race state')
        return
      }

      set_race_state(data.state)
    } catch (error) {
      console.error('Failed to update race state:', error)
      set_error_message('A network error occurred')
    }
  }

  return (
    <Container className="py-24">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Subheading>Management</Subheading>
          <Heading className="mt-2">Admin Dashboard</Heading>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-2 ring-1 ring-gray-200">
            {(['REGISTRATION', 'RACING', 'COMPLETE'] as RaceState[]).map((state) => (
              <button
                key={state}
                onClick={() => handleUpdateState(state)}
                className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  race_state === state 
                    ? 'bg-gray-950 text-white shadow-lg' 
                    : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
          {error_message && (
            <div className="text-[10px] font-black uppercase tracking-widest text-red-600 animate-pulse">
              {error_message}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {admin_links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className="group relative flex flex-col rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-gray-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-900 shadow-inner group-hover:bg-gray-950 group-hover:text-white transition-colors">
              <link.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-gray-950">{link.name}</h3>
            <p className="mt-2 text-sm text-gray-500">{link.description}</p>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-gray-950">
              Open Tool
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        ))}
      </div>
    </Container>
  )
}
