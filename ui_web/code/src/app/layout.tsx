import '@/styles/tailwind.css'
import type { Metadata } from 'next'
import { ChatProvider } from '@/components/chat/chat-provider'
import { ChatDrawer } from '@/components/chat/chat-drawer'

export const metadata: Metadata = {
  title: {
    template: '%s - My App',
    default: 'My App',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/css?f%5B%5D=switzer@400,500,600,700&amp;display=swap"
        />
      </head>
      <body className="text-gray-950 antialiased">
        <ChatProvider>
          {children}
          <ChatDrawer />
        </ChatProvider>
      </body>
    </html>
  )
}
