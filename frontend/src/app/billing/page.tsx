'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  CreditCardIcon,
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ShoppingCartIcon,
  SparklesIcon,
  FireIcon,
  RocketLaunchIcon,
  StarIcon,
  GiftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  bonus?: number
  popular?: boolean
  description: string
}

interface Transaction {
  id: string
  type: 'purchase' | 'usage' | 'bonus'
  amount: number
  credits: number
  description: string
  date: string
  status: 'completed' | 'pending' | 'failed'
}

interface BillingData {
  currentCredits: number
  totalPurchased: number
  totalUsed: number
  monthlyUsage: number
  transactions: Transaction[]
}

export default function BillingPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [timeRange, setTimeRange] = useState('30d')

  const { data: billingData, isLoading, refetch } = useQuery<BillingData>({
    queryKey: ['billing', timeRange],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return {
        currentCredits: 2450,
        totalPurchased: 5000,
        totalUsed: 2550,
        monthlyUsage: 750,
        transactions: [
          {
            id: 'txn_001',
            type: 'purchase',
            amount: 99.99,
            credits: 1000,
            description: 'Professional Credit Package',
            date: '2025-07-01T10:30:00Z',
            status: 'completed'
          },
          {
            id: 'txn_002',
            type: 'usage',
            amount: 0,
            credits: -50,
            description: 'AI Q&A Processing - project-alpha',
            date: '2025-07-01T09:15:00Z',
            status: 'completed'
          },
          {
            id: 'txn_003',
            type: 'usage',
            amount: 0,
            credits: -120,
            description: 'Meeting Transcript Processing - team-sync.mp4',
            date: '2025-06-30T16:45:00Z',
            status: 'completed'
          },
          {
            id: 'txn_004',
            type: 'bonus',
            amount: 0,
            credits: 100,
            description: 'Welcome Bonus',
            date: '2025-06-29T12:00:00Z',
            status: 'completed'
          }
        ]
      }
    }
  })

  const creditPackages: CreditPackage[] = [
    {
      id: 'starter',
      name: 'Starter',
      credits: 500,
      price: 19.99,
      description: 'Perfect for small teams and personal projects'
    },
    {
      id: 'professional',
      name: 'Professional',
      credits: 1000,
      price: 39.99,
      bonus: 100,
      popular: true,
      description: 'Great for growing teams and regular usage'
    },
    {
      id: 'business',
      name: 'Business',
      credits: 2500,
      price: 89.99,
      bonus: 500,
      description: 'Ideal for large teams and heavy usage'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      credits: 5000,
      price: 149.99,
      bonus: 1000,
      description: 'Maximum value for enterprise-level usage'
    }
  ]

  const handlePurchase = async (packageId: string) => {
    const package_ = creditPackages.find(p => p.id === packageId)
    if (!package_) return

    setIsProcessing(true)
    setSelectedPackage(packageId)

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: package_.id,
          credits: package_.credits,
          amount: package_.price
        }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to process purchase. Please try again.')
    } finally {
      setIsProcessing(false)
      setSelectedPackage(null)
    }
  }

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'failed') return <XCircleIcon className="w-5 h-5 text-red-500" />
    if (status === 'pending') return <ClockIcon className="w-5 h-5 text-yellow-500" />
    
    switch (type) {
      case 'purchase':
        return <ShoppingCartIcon className="w-5 h-5 text-green-500" />
      case 'usage':
        return <BoltIcon className="w-5 h-5 text-blue-500" />
      case 'bonus':
        return <GiftIcon className="w-5 h-5 text-purple-500" />
      default:
        return <CheckCircleIcon className="w-5 h-5 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading billing information...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                <CreditCardIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Credits</h1>
                <p className="text-slate-600 dark:text-slate-400">Manage your credits and purchase history</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Current Balance */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <BoltIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {billingData?.currentCredits.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Available Credits</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                  <ShoppingCartIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {billingData?.totalPurchased.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Purchased</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {billingData?.totalUsed.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Used</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {billingData?.monthlyUsage.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This Month</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Credit Packages */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Purchase Credits</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {creditPackages.map((package_) => (
                    <div
                      key={package_.id}
                      className={`relative border-2 rounded-xl p-6 transition-all cursor-pointer ${
                        package_.popular
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                      onClick={() => handlePurchase(package_.id)}
                    >
                      {package_.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <StarIcon className="w-3 h-3" />
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          {package_.name}
                        </h3>
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-slate-900 dark:text-white">
                            ${package_.price}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center justify-center gap-2">
                            <BoltIcon className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {package_.credits.toLocaleString()} Credits
                            </span>
                          </div>
                          {package_.bonus && (
                            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                              <GiftIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                +{package_.bonus} Bonus Credits
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                          {package_.description}
                        </p>
                        
                        <button
                          disabled={isProcessing && selectedPackage === package_.id}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                            package_.popular
                              ? 'bg-blue-500 hover:bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                        >
                          {isProcessing && selectedPackage === package_.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ShoppingCartIcon className="w-4 h-4" />
                              Purchase
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Credit Usage
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Credits are consumed when processing files, generating AI responses, and transcribing meetings. 
                        Each operation has different credit costs based on complexity and resource usage.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Transactions</h2>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                </div>
                
                <div className="space-y-4">
                  {billingData?.transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      {getTransactionIcon(transaction.type, transaction.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(transaction.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {transaction.amount > 0 && (
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            ${transaction.amount.toFixed(2)}
                          </p>
                        )}
                        <p className={`text-sm font-medium ${
                          transaction.credits > 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.credits > 0 ? '+' : ''}{transaction.credits}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-6 py-2 px-4 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download Full History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
