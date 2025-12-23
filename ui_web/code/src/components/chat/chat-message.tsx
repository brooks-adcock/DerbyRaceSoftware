'use client'

import clsx from 'clsx'
import type { ChatMessage as ChatMessageType } from './chat-provider'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const is_user = message.role === 'user'
  
  return (
    <div className={clsx(
      'flex',
      is_user ? 'justify-end' : 'justify-start'
    )}>
      <div className={clsx(
        'max-w-[85%] rounded-2xl px-4 py-2.5',
        is_user 
          ? 'bg-gray-900 text-white' 
          : 'bg-gray-100 text-gray-900',
        message.is_streaming && 'animate-pulse'
      )}>
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content || (message.is_streaming ? '...' : '')}
        </p>
      </div>
    </div>
  )
}

