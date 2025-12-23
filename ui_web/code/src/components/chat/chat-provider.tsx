'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  is_streaming?: boolean
}

export interface HealthCheck {
  id: string
  label: string
  is_ok: boolean
  message: string
}

export interface HealthStatus {
  is_healthy: boolean
  checks: HealthCheck[]
}

interface ChatContextType {
  messages: ChatMessage[]
  is_open: boolean
  is_connected: boolean
  is_loading: boolean
  health_status: HealthStatus | null
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  sendMessage: (content: string) => void
  clearMessages: () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8888/ws/chat'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888'

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [is_open, setIsOpen] = useState(false)
  const [is_connected, setIsConnected] = useState(false)
  const [is_loading, setIsLoading] = useState(false)
  const [health_status, setHealthStatus] = useState<HealthStatus | null>(null)
  
  const ws_ref = useRef<WebSocket | null>(null)
  const current_assistant_id = useRef<string | null>(null)

  // Fetch health status
  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`)
      if (response.ok) {
        const data = await response.json()
        setHealthStatus(data)
      }
    } catch {
      setHealthStatus({
        is_healthy: false,
        checks: [{
          id: 'api_connection',
          label: 'API Connection',
          is_ok: false,
          message: 'Cannot connect to API server'
        }]
      })
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (ws_ref.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    
    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connected')
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket disconnected')
      // Attempt reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleServerMessage(data)
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }
    
    ws_ref.current = ws
  }, [])

  const handleServerMessage = useCallback((data: { type: string; content?: string; name?: string; result?: string; args?: Record<string, unknown> }) => {
    switch (data.type) {
      case 'chunk':
        // Append chunk to current assistant message
        if (current_assistant_id.current) {
          setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => 
            msg.id === current_assistant_id.current
              ? { ...msg, content: msg.content + (data.content || '') }
              : msg
          ))
        }
        break
      
      case 'tool_call':
        // Show tool call in the stream
        if (current_assistant_id.current) {
          setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => 
            msg.id === current_assistant_id.current
              ? { ...msg, content: msg.content + `\n🔧 Calling tool: ${data.name}...\n` }
              : msg
          ))
        }
        break
      
      case 'tool_result':
        // Show tool result
        if (current_assistant_id.current) {
          setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => 
            msg.id === current_assistant_id.current
              ? { ...msg, content: msg.content + `✓ ${data.name}: ${data.result}\n\n` }
              : msg
          ))
        }
        break
      
      case 'done':
        // Mark streaming as complete
        if (current_assistant_id.current) {
          setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => 
            msg.id === current_assistant_id.current
              ? { ...msg, is_streaming: false }
              : msg
          ))
        }
        current_assistant_id.current = null
        setIsLoading(false)
        break
      
      case 'error':
        // Show error message
        if (current_assistant_id.current) {
          setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => 
            msg.id === current_assistant_id.current
              ? { ...msg, content: msg.content + `\n❌ Error: ${data.content}`, is_streaming: false }
              : msg
          ))
        }
        current_assistant_id.current = null
        setIsLoading(false)
        break
    }
  }, [])

  useEffect(() => {
    connectWebSocket()
    fetchHealth()
    
    // Refresh health every 30 seconds
    const health_interval = setInterval(fetchHealth, 30000)
    
    return () => {
      ws_ref.current?.close()
      clearInterval(health_interval)
    }
  }, [connectWebSocket, fetchHealth])

  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])
  const toggleChat = useCallback(() => setIsOpen((prev: boolean) => !prev), [])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !ws_ref.current || ws_ref.current.readyState !== WebSocket.OPEN) {
      return
    }

    // Add user message
    const user_msg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim()
    }
    
    // Create placeholder for assistant response
    const assistant_id = `assistant-${Date.now()}`
    const assistant_msg: ChatMessage = {
      id: assistant_id,
      role: 'assistant',
      content: '',
      is_streaming: true
    }
    
    current_assistant_id.current = assistant_id
    setMessages((prev: ChatMessage[]) => [...prev, user_msg, assistant_msg])
    setIsLoading(true)
    
    // Send to server
    ws_ref.current.send(JSON.stringify({
      type: 'chat',
      content: content.trim()
    }))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const value: ChatContextType = {
    messages,
    is_open,
    is_connected,
    is_loading,
    health_status,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    clearMessages
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}
