'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useUserData } from '@/hooks/useUserData'
import { toast } from 'sonner'
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
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

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
  totalSpent: number
  transactions: Transaction[]
  creditsChart: {
    labels: string[]
    purchased: number[]
    used: number[]
  }
  spendingChart: {
    labels: string[]
    amounts: number[]
  }
}

export default function BillingPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [timeRange, setTimeRange] = useState('30d')
  const searchParams = useSearchParams()
  const { refetchUserData } = useUserData()

  const { data: billingData, isLoading, refetch } = useQuery<BillingData>({
    queryKey: ['billing', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/billing?timeRange=${timeRange}`)
      if (!response.ok) throw new Error('Failed to fetch billing data')
      return response.json()
    }
  })

  // Handle successful payment redirect
  useEffect(() => {
    if (!searchParams) return
    
    const success = searchParams.get('success')
    const sessionId = searchParams.get('session_id')
    
    if (success === 'true' && sessionId) {
      // Payment was successful - refresh data immediately
      setTimeout(() => {
        refetch()
        refetchUserData(true) // Force refresh with cache clearing
        toast.success('Payment successful! Your credits have been added.')
      }, 500) // Small delay to ensure webhook has processed
      
      // Clear URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, refetchUserData, refetch])

  // Also refresh when window gains focus (user returns from Stripe)
  useEffect(() => {
    const handleFocus = () => {
      // Check if we recently had a purchase redirect
      const url = new URL(window.location.href)
      if (url.searchParams.get('success') || url.searchParams.get('session_id')) {
        return // Will be handled by other effect
      }
      
      // If user returns to billing page, refresh data
      refetch()
      refetchUserData(true)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetch, refetchUserData])

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
          amount: package_.price,
          packageName: package_.name
        }),
      })

      if (response.ok) {
        const { url } = await response.json()
        toast.success('Redirecting to checkout...')
        window.location.href = url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error('Failed to process purchase. Please try again.')
    } finally {
      setIsProcessing(false)
      setSelectedPackage(null)
    }
  }

  const downloadFullHistory = async () => {
    try {
      const response = await fetch('/api/billing/download-history')
      if (!response.ok) throw new Error('Failed to download history')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `billing-history-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Billing history downloaded successfully')
    } catch (error) {
      console.error('Error downloading history:', error)
      toast.error('Failed to download billing history')
    }
  }

  const downloadInvoice = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/billing/invoice/${transactionId}`)
      if (!response.ok) throw new Error('Failed to download invoice')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `invoice-${transactionId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Invoice downloaded successfully')
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Failed to download invoice')
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

  // Chart configurations
  const chartOptions: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)',
        },
      },
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)',
        },
      },
    },
  }

  const creditsChartData = {
    labels: billingData?.creditsChart?.labels || [],
    datasets: [
      {
        label: 'Credits Purchased',
        data: billingData?.creditsChart?.purchased || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Credits Used',
        data: billingData?.creditsChart?.used || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  }

  const spendingChartData = {
    labels: billingData?.spendingChart?.labels || [],
    datasets: [
      {
        label: 'Amount Spent ($)',
        data: billingData?.spendingChart?.amounts || [],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
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
            <div className="flex items-center gap-4 justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Credits</h1>
                  <p className="text-slate-600 dark:text-slate-400">Manage your credits and purchase history</p>
                </div>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={() => {
                  refetch()
                  refetchUserData(true)
                  toast.success('Data refreshed!')
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                disabled={isLoading}
              >
                <ArrowTrendingUpIcon className="w-4 h-4" />
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
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
                  <CurrencyDollarIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${billingData?.totalSpent?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Spent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Credits Usage Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Credits Overview
                </h3>
                <div className="flex gap-2">
                  {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        timeRange === range
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <Line data={creditsChartData} options={chartOptions} />
                )}
              </div>
            </div>

            {/* Spending Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Monthly Spending
              </h3>
              <div className="h-64">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <Bar data={spendingChartData} options={chartOptions} />
                )}
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
                        Credits are primarily consumed when creating and processing new repositories. 
                        Each repository creation uses credits based on the repository size, file count, and complexity of analysis.
                        Q&A queries and meeting features do not consume credits.
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
                  {billingData?.transactions.map((transaction: Transaction) => (
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
                          {transaction.type === 'purchase' && (
                            <button
                              onClick={() => downloadInvoice(transaction.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 flex items-center gap-1"
                            >
                              <DocumentArrowDownIcon className="w-3 h-3" />
                              Invoice
                            </button>
                          )}
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
                
                <button 
                  onClick={downloadFullHistory}
                  className="w-full mt-6 py-2 px-4 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
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
