import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Navbar from '@/components/landing/Navbar'
import SmoothScrollProvider from './SmoothScrollProvider'
import Link from 'next/link'
import Benefits from '@/components/landing/Benefits'

export default function Home() {
  return (
    <SmoothScrollProvider>
      <div style={{ background: '#07090E', minHeight: '100vh', width: '100vw', scrollBehavior: 'smooth' }}>
        <Navbar />
        <Hero />
        <Features />
        <Benefits />
      </div>
    </SmoothScrollProvider>
  )
}
