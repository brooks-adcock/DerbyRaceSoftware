'use client'

import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Link } from '@/components/link'
import { 
  ClipboardDocumentListIcon, 
  Cog6ToothIcon, 
  PlayIcon, 
  StarIcon, 
  TrophyIcon, 
  TvIcon 
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
    name: 'Judging',
    description: 'Score cars for beauty and design awards.',
    href: '/judging',
    icon: StarIcon,
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
  return (
    <Container className="py-24">
      <Subheading>Management</Subheading>
      <Heading className="mt-2">Admin Dashboard</Heading>
      
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
