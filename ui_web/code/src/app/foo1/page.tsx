import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { Heading } from '@/components/text'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Foo 1',
}

export default function Foo1() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <Heading as="h1">Foo 1</Heading>
      </main>
      <Footer />
    </div>
  )
}
