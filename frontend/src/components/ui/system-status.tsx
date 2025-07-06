'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SignalIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  WifiIcon
} from '@heroicons/react/24/outline'

interface SystemStatusProps {
  isLoading?: boolean
  error?: Error | null
  lastUpdated?: string
  refreshInterval?: number
}

export function SystemStatus({ 
  isLoading = false, 
  error = null, 
  lastUpdated, 
  refreshInterval = 30000 
}: SystemStatusProps) {
  const [status, setStatus] = useState<'online' | 'warning' | 'offline'>('online')
  const [timeAgo, setTimeAgo] = useState<string>('')
  const [nextRefresh, setNextRefresh] = useState<number>(refreshInterval / 1000)

  useEffect(() => {
    const updateTimeAgo = () => {
      if (lastUpdated) {
        const now = new Date()
        const updated = new Date(lastUpdated)
        const diff = Math.floor((now.getTime() - updated.getTime()) / 1000)
        
        if (diff < 60) {
          setTimeAgo('Just now')
        } else if (diff < 3600) {
          setTimeAgo(`${Math.floor(diff / 60)}m ago`)
        } else if (diff < 86400) {
          setTimeAgo(`${Math.floor(diff / 3600)}h ago`)
        } else {
          setTimeAgo(`${Math.floor(diff / 86400)}d ago`)
        }
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setNextRefresh((prev) => {
        if (prev <= 1) {
          return refreshInterval / 1000
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [refreshInterval])

  useEffect(() => {
    if (error) {
      setStatus('offline')
    } else if (isLoading) {
      setStatus('warning')
    } else {
      setStatus('online')
    }
  }, [error, isLoading])

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          icon: CheckCircleIcon,
          label: 'System Online',
          description: 'All systems operational'
        }
      case 'warning':
        return {
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
          icon: ExclamationTriangleIcon,
          label: 'Loading',
          description: 'Updating data...'
        }
      case 'offline':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          icon: XCircleIcon,
          label: 'System Error',
          description: error?.message || 'Connection issue'
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`fixed bottom-4 right-4 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-lg border ${statusConfig.borderColor} p-4 shadow-lg max-w-sm`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ 
            scale: status === 'online' ? [1, 1.1, 1] : 1,
            rotate: isLoading ? [0, 360] : 0
          }}
          transition={{ 
            scale: { duration: 2, repeat: Infinity },
            rotate: { duration: 2, repeat: Infinity, ease: "linear" }
          }}
          className={`w-8 h-8 ${statusConfig.bgColor} rounded-lg flex items-center justify-center`}
        >
          <statusConfig.icon className={`w-4 h-4 ${statusConfig.color}`} />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {statusConfig.label}
            </h4>
            <div className={`w-2 h-2 rounded-full ${statusConfig.color.replace('text-', 'bg-')}`}>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-full h-full rounded-full"
              />
            </div>
          </div>
          
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {statusConfig.description}
          </p>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            {lastUpdated && (
              <div className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                <span>{timeAgo}</span>
              </div>
            )}
            
            {status === 'online' && (
              <div className="flex items-center gap-1">
                <WifiIcon className="w-3 h-3" />
                <span>Next: {nextRefresh}s</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signal Strength Indicator */}
      <div className="flex items-center gap-1 mt-3">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height: status === 'online' ? 
                [8, 12, 8] : status === 'warning' ? 
                [6, 10, 6] : [4, 4, 4]
            }}
            transition={{
              duration: 1,
              delay: i * 0.1,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className={`w-1 rounded-full ${
              status === 'online' ? 'bg-green-500' :
              status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            } ${i < 2 ? 'opacity-100' : status === 'offline' ? 'opacity-30' : 'opacity-100'}`}
            style={{ height: 8 }}
          />
        ))}
      </div>
    </motion.div>
  )
}
