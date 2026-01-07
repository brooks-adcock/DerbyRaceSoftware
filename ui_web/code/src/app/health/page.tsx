import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { Heading, Subheading } from '@/components/text'
import { Container } from '@/components/container'
import { SetupChecklist } from '@/components/setup-checklist'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'System Health',
}

export default function HealthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 py-16">
        <Container>
          <div className="max-w-2xl mx-auto">
            <Heading as="h1">System Health</Heading>
            <Subheading className="mt-2">
              Current status of API and integrated services.
            </Subheading>
            
            <div className="mt-8">
              {/* Using the existing SetupChecklist but modified to always show in this context */}
              <SetupChecklist force_show={true} />
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
