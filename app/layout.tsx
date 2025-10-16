// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css'
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'VelosDrop | On-Demand Local Delivery',
  description: 'Fast and reliable delivery of your goods',
}

// Remove viewport from metadata and create separate viewport export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // userScalable: false, // Optional: if you want to disable zoom
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Remove the duplicate viewport meta tag from head */}
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 w-full relative overflow-hidden">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}