'use client'

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import { Bars2Icon, XMarkIcon } from '@heroicons/react/24/solid'
import { Link } from './link'

const links = [
  { href: '/foo1', label: 'Foo 1' },
  { href: '/health', label: 'Health' },
]

export function Navbar() {
  return (
    <Disclosure as="header" className="border-b border-gray-200 bg-white">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <Link href="/" className="text-xl font-semibold text-gray-900">
                My App
              </Link>
              
              <nav className="hidden space-x-8 md:flex">
                {links.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <DisclosureButton className="md:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                {open ? (
                  <XMarkIcon className="size-6" />
                ) : (
                  <Bars2Icon className="size-6" />
                )}
              </DisclosureButton>
            </div>
          </div>

          <DisclosurePanel className="md:hidden border-t border-gray-200 bg-white">
            <div className="space-y-1 px-4 py-3">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block py-2 text-base font-medium text-gray-600 hover:text-gray-900"
                >
                  {label}
                </Link>
              ))}
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}
