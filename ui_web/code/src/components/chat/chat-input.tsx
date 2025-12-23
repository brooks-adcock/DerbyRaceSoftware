'use client'

import { useState, useCallback, KeyboardEvent } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { useChat } from './chat-provider'

export function ChatInput() {
  const [input, setInput] = useState('')
  const { sendMessage, is_loading, is_connected } = useChat()

  const handleSubmit = useCallback(() => {
    if (input.trim() && !is_loading && is_connected) {
      sendMessage(input)
      setInput('')
    }
  }, [input, is_loading, is_connected, sendMessage])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div className="flex items-end gap-2">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={is_connected ? "Type a message..." : "Connecting..."}
        disabled={!is_connected}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0 disabled:bg-gray-50 disabled:text-gray-400"
        style={{ minHeight: '42px', maxHeight: '120px' }}
      />
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || is_loading || !is_connected}
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        <PaperAirplaneIcon className="h-5 w-5" />
      </button>
    </div>
  )
}

