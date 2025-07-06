'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  DocumentArrowDownIcon,
  ShareIcon,
  PrinterIcon,
  CogIcon,
  BellIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface AnalyticsActionsProps {
  data?: any
  onExport?: () => void
  onShare?: () => void
  onPrint?: () => void
  onScheduleReport?: () => void
}

export function AnalyticsActions({ 
  data, 
  onExport, 
  onShare, 
  onPrint, 
  onScheduleReport 
}: AnalyticsActionsProps) {
  const handleExportToPDF = () => {
    if (onExport) {
      onExport()
    } else {
      // Default export logic
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Analytics Report - ${new Date().toLocaleDateString()}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
                .insights { background: #f5f5f5; padding: 15px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>GitTLDR Analytics Report</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
              </div>
              <div class="content">
                ${data ? JSON.stringify(data, null, 2) : 'No data available'}
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleShare = () => {
    if (onShare) {
      onShare()
    } else {
      if (navigator.share) {
        navigator.share({
          title: 'GitTLDR Analytics Report',
          text: 'Check out my analytics dashboard insights',
          url: window.location.href
        })
      } else {
        // Fallback: copy link to clipboard
        navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard!')
      }
    }
  }

  const actions = [
    {
      label: 'Export PDF',
      icon: DocumentArrowDownIcon,
      onClick: handleExportToPDF,
      color: 'from-green-500 to-emerald-600',
      description: 'Download comprehensive report'
    },
    {
      label: 'Share',
      icon: ShareIcon,
      onClick: handleShare,
      color: 'from-blue-500 to-cyan-600',
      description: 'Share dashboard link'
    },
    {
      label: 'Print',
      icon: PrinterIcon,
      onClick: onPrint || (() => window.print()),
      color: 'from-purple-500 to-violet-600',
      description: 'Print current view'
    },
    {
      label: 'Schedule',
      icon: CalendarIcon,
      onClick: onScheduleReport || (() => alert('Schedule feature coming soon!')),
      color: 'from-orange-500 to-amber-600',
      description: 'Schedule regular reports'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <CogIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Actions & Reports
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Export, share, and manage your analytics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className={`group relative overflow-hidden bg-gradient-to-r ${action.color} p-4 rounded-lg text-white shadow-lg hover:shadow-xl transition-all`}
          >
            <div className="relative z-10">
              <action.icon className="w-6 h-6 mb-2 mx-auto" />
              <div className="text-sm font-medium mb-1">{action.label}</div>
              <div className="text-xs opacity-90">{action.description}</div>
            </div>
            
            {/* Hover effect */}
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <BellIcon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Recent Activity
          </span>
        </div>
        
        <div className="space-y-2">
          {[
            { action: 'Analytics updated', time: '2 minutes ago', type: 'update' },
            { action: 'Report generated', time: '1 hour ago', type: 'export' },
            { action: 'Data refreshed', time: '3 hours ago', type: 'refresh' }
          ].map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'update' ? 'bg-green-500' :
                activity.type === 'export' ? 'bg-blue-500' : 'bg-yellow-500'
              }`} />
              <div className="flex-1">
                <div className="text-sm text-slate-900 dark:text-white">
                  {activity.action}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <ClockIcon className="w-3 h-3" />
                  {activity.time}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
