'use client'

import { useState } from 'react'
import { FileItem } from './types'
import { toast } from 'react-toastify'

interface QuickActionsProps {
  selectedFile: FileItem | null
  fileContent: string | null
  onDownloadFile: () => void
  onCopyContent: () => void
  onCopySummary: () => void
  onDownloadSummary: () => void
}

export default function QuickActions({
  selectedFile,
  fileContent,
  onDownloadFile,
  onCopyContent,
  onCopySummary,
  onDownloadSummary
}: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!selectedFile) return null

  const copyFilePath = async () => {
    try {
      await navigator.clipboard.writeText(selectedFile.path)
      toast.success('File path copied to clipboard!')
      setIsOpen(false)
    } catch (err) {
      toast.error('Failed to copy file path')
    }
  }

  const copyFileName = async () => {
    try {
      await navigator.clipboard.writeText(selectedFile.name)
      toast.success('File name copied to clipboard!')
      setIsOpen(false)
    } catch (err) {
      toast.error('Failed to copy file name')
    }
  }

  const copyFileInfo = async () => {
    try {
      const info = [
        `File: ${selectedFile.name}`,
        `Path: ${selectedFile.path}`,
        `Type: ${selectedFile.language || 'Unknown'}`,
        selectedFile.size ? `Size: ${(selectedFile.size / 1024).toFixed(1)} KB` : '',
        fileContent ? `Lines: ${fileContent.split('\n').length}` : ''
      ].filter(Boolean).join('\n')
      
      await navigator.clipboard.writeText(info)
      toast.success('File information copied to clipboard!')
      setIsOpen(false)
    } catch (err) {
      toast.error('Failed to copy file information')
    }
  }

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Quick Actions"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
            <div className="py-2">
              {/* File Actions */}
              <div className="px-3 py-1">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  File Actions
                </div>
              </div>
              
              {fileContent && (
                <>
                  <button
                    onClick={() => handleAction(onCopyContent)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Content
                  </button>
                  
                  <button
                    onClick={() => handleAction(onDownloadFile)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download File
                  </button>
                </>
              )}

              {/* AI Summary Actions */}
              {selectedFile.summary && (
                <>
                  <div className="border-t border-slate-200 dark:border-slate-600 my-2"></div>
                  <div className="px-3 py-1">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      AI Summary
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAction(onCopySummary)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Summary
                  </button>
                  
                  <button
                    onClick={() => handleAction(onDownloadSummary)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Summary
                  </button>
                </>
              )}

              {/* Copy Actions */}
              <div className="border-t border-slate-200 dark:border-slate-600 my-2"></div>
              <div className="px-3 py-1">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Copy to Clipboard
                </div>
              </div>
              
              <button
                onClick={copyFileName}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Copy File Name
              </button>
              
              <button
                onClick={copyFilePath}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Copy File Path
              </button>
              
              <button
                onClick={copyFileInfo}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Copy File Info
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
