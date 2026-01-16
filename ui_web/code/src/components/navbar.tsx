'use client'

import { useState } from 'react'
import { ChevronRightIcon } from '@heroicons/react/24/solid'
import { MenuDrawer } from './menu-drawer'

const links = [
  { href: '/', label: 'My Registrations' },
  { href: '/register', label: 'Register New Car' },
  { href: '/admin', label: 'Admin Dashboard' },
  { href: '/registration', label: 'Registration List' },
  { href: '/setup', label: 'Race Setup' },
  { href: '/heats', label: 'Heat Control' },
  { href: '/judging', label: 'Judging: Beauty' },
  { href: '/results', label: 'Results' },
  { href: '/public', label: 'Public Display' },
]

export function Navbar() {
  const [is_drawer_open, set_is_drawer_open] = useState(false)

  return (
    <>
      <button
        onClick={() => set_is_drawer_open(true)}
        className="fixed left-4 top-4 z-40 rounded-full bg-white p-2 text-gray-600 shadow-md ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-900 focus:outline-none"
        aria-label="Open menu"
      >
        <ChevronRightIcon className="size-6" />
      </button>

      <MenuDrawer
        is_open={is_drawer_open}
        onClose={() => set_is_drawer_open(false)}
        links={links}
      />
    </>
  )
}
