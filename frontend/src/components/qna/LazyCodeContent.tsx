'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { FileContent } from '@/hooks/useQnAFiltering'
import dynamic from 'next/dynamic'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from '@/contexts/ThemeContext'
import { getLanguageForHighlighter } from '@/components/files/FileIconUtils'


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
  const { actualTheme } = useTheme()
  const isDarkMode = actualTheme === 'dark'
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
      <div className="my-2">
        <div className="flex-1 overflow-auto">
          <SyntaxHighlighter
            language={(() => {
              // Try language, then extension, then fallback
              const lang = (fileContent.language || '').toLowerCase();
              const ext = filePath.split('.').pop()?.toLowerCase() || '';
              // Prism sometimes expects 'python' or 'py', but only 'python' is supported in most builds
              if (lang === 'python' || lang === 'py' || ext === 'py') return 'python';
              // Try mapping with getLanguageForHighlighter
              const mapped = getLanguageForHighlighter(lang || ext);
              // If mapping returns 'python' or 'py', force 'python'
              if (mapped === 'python' || mapped === 'py') return 'python';
              return mapped;
            })()}
            style={isDarkMode ? vscDarkPlus : prism}
            showLineNumbers={true}
            wrapLines={true}
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              background: 'transparent',
              fontSize: '14px',
              lineHeight: '1.6',
              height: '100%'
            }}
            lineNumberStyle={{
              minWidth: fileContent.content && fileContent.content.split('\n').length > 999 ? '4em' : '3em',
              paddingRight: '1em',
              color: isDarkMode ? '#64748b' : '#94a3b8',
              fontSize: '12px',
              userSelect: 'none'
            }}
          >
            {fileContent.content}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
})

LazyCodeContent.displayName = 'LazyCodeContent'

export default LazyCodeContent
