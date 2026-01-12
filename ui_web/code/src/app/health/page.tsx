import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { Heading, Subheading } from '@/components/text'
import { Container } from '@/components/container'
import { SetupChecklist } from '@/components/setup-checklist'
import { Link } from '@/components/link'
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

            <div className="mt-8 border-t border-gray-100 pt-8">
              <Heading as="h2" className="text-base font-semibold text-gray-900">Tools</Heading>
              <div className="mt-4">
                <Link 
                  href="http://localhost:5050" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-2"
                  target="_blank"
                >
                  Database Manager (pgAdmin)
                  <span aria-hidden="true">&rarr;</span>
                </Link>
                <p className="mt-1 text-xs text-gray-500">
                  Login credentials can be found in your <code className="bg-gray-100 px-1 rounded">template.env</code> file.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
