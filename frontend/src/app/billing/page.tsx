'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Subscription {
  id: string
  status: 'active' | 'cancelled' | 'past_due'
  plan: 'free' | 'pro' | 'enterprise'
  currentPeriodEnd: string
  credits: number
  usageThisMonth: number
}

interface Invoice {
  id: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  date: string
  downloadUrl: string
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/billing')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error fetching billing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (plan: string) => {
    setIsUpgrading(true)
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        }
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Failed to start upgrade process. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.portalUrl) {
          window.location.href = data.portalUrl
        }
      } else {
        throw new Error('Failed to access billing portal')
      }
    } catch (error) {
      console.error('Error accessing billing portal:', error)
      alert('Failed to access billing portal. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-secondary-100 text-secondary-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      case 'past_due': return 'bg-accent-100 text-accent-700'
      default: return 'bg-neutral-100 text-neutral-700'
    }
  }

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'free': return 'Free'
      case 'pro': return 'Pro'
      case 'enterprise': return 'Enterprise'
      default: return 'Unknown'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading billing information...</p>
        </div>
      </div>
    )
  }
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="ghost" className="p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
              </Link>
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-neutral-800">Billing & Subscription</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Subscription */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">Current Subscription</h2>
          <Card className="p-6 bg-white">
            {subscription ? (
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-neutral-800">
                      {getPlanName(subscription.plan)} Plan
                    </h3>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(subscription.status)}`}>
                      {subscription.status}
                    </span>
                  </div>
                  <p className="text-neutral-600 mb-4">
                    {subscription.plan === 'free' 
                      ? 'Free tier with limited features'
                      : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    }
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">Available Credits</p>
                      <p className="text-2xl font-bold text-primary-500">{subscription.credits}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Used This Month</p>
                      <p className="text-2xl font-bold text-accent-500">{subscription.usageThisMonth}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  {subscription.plan !== 'free' && (
                    <Button
                      onClick={handleManageSubscription}
                      variant="outline"
                      className="border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    >
                      Manage Subscription
                    </Button>
                  )}
                  {subscription.plan === 'free' && (
                    <Button
                      onClick={() => handleUpgrade('pro')}
                      disabled={isUpgrading}
                      className="bg-primary-500 hover:bg-primary-600 text-white"
                    >
                      {isUpgrading ? 'Processing...' : 'Upgrade to Pro'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-600 mb-4">No subscription found</p>
                <Button
                  onClick={() => handleUpgrade('pro')}
                  disabled={isUpgrading}
                  className="bg-primary-500 hover:bg-primary-600 text-white"
                >
                  {isUpgrading ? 'Processing...' : 'Get Started with Pro'}
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Pricing Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">Pricing Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <Card className="p-6 bg-white border-2 border-neutral-200">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">Free</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-neutral-800">$0</span>
                  <span className="text-neutral-600">/month</span>
                </div>
                <ul className="text-sm text-neutral-600 space-y-2 mb-6 text-left">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    5 repositories
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    100 Q&A credits/month
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basic summaries
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full border-neutral-300 text-neutral-700"
                  disabled={subscription?.plan === 'free'}
                >
                  {subscription?.plan === 'free' ? 'Current Plan' : 'Downgrade'}
                </Button>
              </div>
            </Card>

            {/* Pro Plan */}
            <Card className="p-6 bg-white border-2 border-primary-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-500 text-white px-3 py-1 text-xs font-medium rounded-full">
                  Most Popular
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">Pro</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-primary-500">$29</span>
                  <span className="text-neutral-600">/month</span>
                </div>
                <ul className="text-sm text-neutral-600 space-y-2 mb-6 text-left">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited repositories
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    5,000 Q&A credits/month
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Advanced summaries
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Meeting transcription
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Priority support
                  </li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('pro')}
                  disabled={isUpgrading || subscription?.plan === 'pro'}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white"
                >
                  {subscription?.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </Button>
              </div>
            </Card>

            {/* Enterprise Plan */}
            <Card className="p-6 bg-white border-2 border-neutral-200">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">Enterprise</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-neutral-800">$99</span>
                  <span className="text-neutral-600">/month</span>
                </div>
                <ul className="text-sm text-neutral-600 space-y-2 mb-6 text-left">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Everything in Pro
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    20,000 Q&A credits/month
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Team collaboration
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Custom integrations
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-secondary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Dedicated support
                  </li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('enterprise')}
                  disabled={isUpgrading || subscription?.plan === 'enterprise'}
                  variant="outline"
                  className="w-full border-neutral-300 text-neutral-700"
                >
                  {subscription?.plan === 'enterprise' ? 'Current Plan' : 'Contact Sales'}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Billing History */}
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-4">Billing History</h2>
          <Card className="bg-white">
            {invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-neutral-200">
                    <tr>
                      <th className="text-left py-3 px-6 text-sm font-medium text-neutral-700">Date</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-neutral-700">Amount</th>
                      <th className="text-left py-3 px-6 text-sm font-medium text-neutral-700">Status</th>
                      <th className="text-right py-3 px-6 text-sm font-medium text-neutral-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-neutral-100">
                        <td className="py-4 px-6 text-sm text-neutral-800">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-sm text-neutral-800">
                          ${(invoice.amount / 100).toFixed(2)}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            invoice.status === 'paid' ? 'bg-secondary-100 text-secondary-700' :
                            invoice.status === 'pending' ? 'bg-accent-100 text-accent-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {invoice.status === 'paid' && (
                            <a
                              href={invoice.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-500 hover:text-primary-600 text-sm font-medium"
                            >
                              Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-neutral-800 mb-2">No billing history</h4>
                <p className="text-neutral-600">Your invoices and payment history will appear here.</p>
              </div>
            )}
          </Card>        </div>
      </main>
    </div>
    </AuthGuard>
  )
}
