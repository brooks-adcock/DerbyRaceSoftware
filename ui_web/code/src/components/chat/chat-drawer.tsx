'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon, TrashIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useChat } from './chat-provider'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'

function HealthWarning() {
  const { health_status } = useChat()
  
  if (!health_status || health_status.is_healthy) {
    return null
  }
  
  const failed_checks = health_status.checks.filter(c => !c.is_ok)
  
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">
            Setup required
          </p>
          <ul className="mt-1 space-y-1">
            {failed_checks.map((check) => (
              <li key={check.id} className="flex items-center gap-1.5 text-xs text-amber-700">
                <XCircleIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span>{check.label}: {check.message}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-amber-600 mt-2">
            See <code className="bg-amber-100 px-1 rounded">.helper/gemini_setup.md</code>
          </p>
        </div>
      </div>
    </div>
  )
}

export function ChatDrawer() {
  const { is_open, closeChat, messages, is_connected, clearMessages, health_status } = useChat()
  
  const is_healthy = health_status?.is_healthy ?? true

  return (
    <Dialog open={is_open} onClose={closeChat} className="relative z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <DialogPanel
              className="pointer-events-auto w-screen max-w-md transform transition-transform duration-300 ease-in-out data-[closed]:translate-x-full"
            >
              <div className="flex h-full flex-col bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                      Chat
                    </DialogTitle>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      is_connected && is_healthy
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        is_connected && is_healthy ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {!is_connected ? 'Disconnected' : !is_healthy ? 'Not Ready' : 'Ready'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearMessages}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Clear messages"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={closeChat}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Health warning */}
                <HealthWarning />

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-gray-400 text-sm">
                        {is_healthy ? 'Start a conversation...' : 'Complete setup to start chatting'}
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))
                  )}
                </div>

                {/* Input area */}
                <div className="border-t border-gray-200 p-4">
                  <ChatInput />
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
