'use client'

import { Container } from '@/components/container'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Heading, Subheading } from '@/components/text'
import { useParams } from 'next/navigation'

export default function RaceSettingsPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 py-16">
        <Container>
          <div className="max-w-2xl mx-auto">
            <Heading as="h1">Race Settings</Heading>
            <Subheading className="mt-2">
              Configure details for race ID: {id}
            </Subheading>
            
            <div className="mt-8 p-6 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-gray-600">
                Settings for this race will appear here.
              </p>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
