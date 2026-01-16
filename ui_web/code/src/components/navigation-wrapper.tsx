'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/navbar'

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const show_navbar = pathname !== '/'

  return (
    <>
      {show_navbar && <Navbar />}
      {children}
    </>
  )
}
