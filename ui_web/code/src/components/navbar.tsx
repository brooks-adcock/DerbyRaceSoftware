'use client'

import { useState } from 'react'
import { ChevronRightIcon } from '@heroicons/react/24/solid'
import { MenuDrawer } from './menu-drawer'
import { PiStatusBadge } from './pi-status-badge'

const links = [
  { href: '/admin', label: 'Admin Dashboard' },
  { href: '/registration', label: 'Registration List' },
  { href: '/setup', label: 'Race Setup' },
  { href: '/heats', label: 'Heat Control' },
  { href: '/judges', label: 'Judges' },
  { href: '/judging', label: 'Judging: Beauty' },
  { href: '/standings', label: 'Standings' },
  { href: '/results', label: 'Results' },
  { href: '/public', label: 'Public Display' },
  { href: '', label: '', is_divider: true },
  { href: '/', label: 'My Registrations' },
  { href: '/register', label: 'Register New Car' },
]

export function Navbar() {
  const [is_drawer_open, set_is_drawer_open] = useState(false)

  return (
    <>
      <button
        onClick={() => set_is_drawer_open(true)}
        className="fixed left-4 top-4 z-40 rounded-full bg-white p-2.5 text-gray-600 shadow-lg ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-950"
        aria-label="Open menu"
      >
        <ChevronRightIcon className="size-5" />
      </button>

      <MenuDrawer
        is_open={is_drawer_open}
        onClose={() => set_is_drawer_open(false)}
        links={links}
      />

      <PiStatusBadge />
    </>
  )
}
