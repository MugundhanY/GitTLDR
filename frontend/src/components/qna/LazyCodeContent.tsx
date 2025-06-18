'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { FileContent } from '@/hooks/useQnAFiltering'

interface LazyCodeContentProps {
  fileContent: FileContent
  formatCodeContent: (content: string, language: string) => string
  isCopied: boolean
  copyToClipboard: (text: string, filePath: string) => void
  filePath: string
  isPageVisible?: boolean
}

const LazyCodeContent = memo(({
  fileContent, 
  formatCodeContent, 
  isCopied, 
  copyToClipboard, 
  filePath,
  isPageVisible = true
}: LazyCodeContentProps) => {
  const [shouldRender, setShouldRender] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Only render when page is visible and delay for performance
    if (isPageVisible) {
      const timer = setTimeout(() => setShouldRender(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShouldRender(false)
    }
  }, [isPageVisible])

  if (!shouldRender || !isPageVisible) {
    return (
      <div className="p-4 flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></div>
        {!isPageVisible ? 'Content paused (tab not active)' : 'Rendering code...'}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      {isCopied && (
        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded z-10">
          Copied!
        </div>
      )}
      <pre className="p-4 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 overflow-x-auto max-h-96">
        <code 
          className={`language-${fileContent.language}`}
          dangerouslySetInnerHTML={{
            __html: formatCodeContent(fileContent.content, fileContent.language)
          }}
        />
      </pre>
    </div>
  )
})

LazyCodeContent.displayName = 'LazyCodeContent'

export default LazyCodeContent
