'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  KeyIcon,
  XMarkIcon,
  CommandLineIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  ShareIcon,
  PrinterIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface KeyboardShortcutsProps {
  onExport?: () => void
  onRefresh?: () => void
  onShare?: () => void
  onPrint?: () => void
  onSwitchTab?: (tab: string) => void
}

export function KeyboardShortcuts({
  onExport,
  onRefresh,
  onShare,
  onPrint,
  onSwitchTab
}: KeyboardShortcutsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts = [
    {
      keys: ['Ctrl', 'E'],
      description: 'Export analytics',
      action: onExport,
      icon: DocumentArrowDownIcon
    },
    {
      keys: ['Ctrl', 'R'],
      description: 'Refresh data',
      action: onRefresh,
      icon: ArrowPathIcon
    },
    {
      keys: ['Ctrl', 'S'],
      description: 'Share dashboard',
      action: onShare,
      icon: ShareIcon
    },
    {
      keys: ['Ctrl', 'P'],
      description: 'Print dashboard',
      action: onPrint,
      icon: PrinterIcon
    },
    {
      keys: ['1'],
      description: 'Overview tab',
      action: () => onSwitchTab?.('overview'),
      icon: ChartBarIcon
    },
    {
      keys: ['2'],
      description: 'Files tab',
      action: () => onSwitchTab?.('files'),
      icon: DocumentTextIcon
    },
    {
      keys: ['3'],
      description: 'Meetings tab',
      action: () => onSwitchTab?.('meetings'),
      icon: DocumentTextIcon
    },
    {
      keys: ['4'],
      description: 'Q&A tab',
      action: () => onSwitchTab?.('qna'),
      icon: ChatBubbleLeftIcon
    },
    {
      keys: ['5'],
      description: 'Users tab',
      action: () => onSwitchTab?.('users'),
      icon: UserGroupIcon
    },
    {
      keys: ['?'],
      description: 'Show shortcuts',
      action: () => setShowHelp(!showHelp),
      icon: KeyIcon
    }
  ]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return
      }

      const key = event.key.toLowerCase()
      const isCtrlPressed = event.ctrlKey || event.metaKey

      // Show/hide help
      if (event.key === '?' && !isCtrlPressed) {
        event.preventDefault()
        setShowHelp(!showHelp)
        return
      }

      // Handle shortcuts
      shortcuts.forEach(shortcut => {
        const [firstKey, secondKey] = shortcut.keys.map(k => k.toLowerCase())
        
        if (shortcut.keys.length === 2 && 
            firstKey === 'ctrl' && 
            key === secondKey && 
            isCtrlPressed) {
          event.preventDefault()
          shortcut.action?.()
        } else if (shortcut.keys.length === 1 && 
                   key === firstKey && 
                   !isCtrlPressed) {
          event.preventDefault()
          shortcut.action?.()
        }
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, showHelp])

  return (
    <>
      {/* Help Trigger - Always visible */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 left-4 z-40"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowHelp(!showHelp)}
          className="w-10 h-10 bg-slate-900/90 dark:bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-white dark:text-slate-900 shadow-lg hover:bg-slate-800 dark:hover:bg-white transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <KeyIcon className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Shortcuts Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <CommandLineIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Keyboard Shortcuts
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Navigate faster with these shortcuts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 space-y-4">
                {shortcuts.map((shortcut, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <shortcut.icon className="w-4 h-4 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
                      <span className="text-sm text-slate-900 dark:text-white">
                        {shortcut.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-slate-400 text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 pt-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">?</kbd> anytime to toggle this panel
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
