import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Navbar from '@/components/landing/Navbar'
import SmoothScrollProvider from './SmoothScrollProvider'
import Link from 'next/link'
import Benefits from '@/components/landing/Benefits'
import Testimonials from '@/components/landing/Testimonials'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GitTLDR - AI-Powered Repository Intelligence & Automated Issue Fixing',
  description: 'Transform your Git repositories with AI-powered analytics, automated issue fixing, intelligent Q&A, and meeting summaries. Fix GitHub issues automatically with validated code and pull requests.',
  openGraph: {
    title: 'GitTLDR - AI-Powered Repository Intelligence & Automated Issue Fixing',
    description: 'Transform your Git repositories with AI-powered analytics, automated issue fixing, and intelligent code insights.',
    url: 'https://gittldr.vercel.app',
    siteName: 'GitTLDR',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GitTLDR - AI-Powered Repository Analytics & Issue Fixing Platform',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GitTLDR - AI-Powered Repository Intelligence',
    description: 'Transform your Git repositories with AI-powered analytics, automated issue fixing, and meeting intelligence.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://gittldr.vercel.app',
  },
}

export default function Home() {
  return (
    <SmoothScrollProvider>
      <div style={{ background: '#07090E', minHeight: '100vh', width: '100vw', scrollBehavior: 'smooth' }}>
        <Navbar />
        <Hero />
        <Features />
        <Benefits />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
        <Footer />
      </div>
    </SmoothScrollProvider>
  )
}
