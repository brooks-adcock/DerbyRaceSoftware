'use client'

import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { Heading } from '@/components/text'
import { SetupChecklist } from '@/components/setup-checklist'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { useChat } from '@/components/chat/chat-provider'

export default function Home() {
  const { toggleChat, is_connected } = useChat()
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        <Heading as="h1">Hello World</Heading>
        
        {/* Setup checklist - only shows when there are issues */}
        <div className="w-full max-w-md">
          <SetupChecklist />
        </div>
      </main>
      <Footer />
      
      {/* Floating chat button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-all hover:bg-gray-800 hover:scale-105 active:scale-95"
        title="Open chat"
      >
        <ChatBubbleLeftRightIcon className="h-6 w-6" />
        {/* Connection indicator */}
        <span className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
          is_connected ? 'bg-green-500' : 'bg-red-500'
        }`} />
      </button>
    </div>
  )
}
