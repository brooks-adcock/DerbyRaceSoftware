import '@/styles/tailwind.css'
import type { Metadata } from 'next'
import { NavigationWrapper } from '@/components/navigation-wrapper'

export const metadata: Metadata = {
  title: {
    template: '%s - Pinewood Derby',
    default: 'Pinewood Derby',
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
        <NavigationWrapper>
          {children}
        </NavigationWrapper>
      </body>
    </html>
  )
}
