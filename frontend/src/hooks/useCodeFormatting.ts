'use client'

import { useMemo, useCallback, useRef, useState, useEffect } from 'react'

// Language configuration for syntax highlighting
const LANGUAGE_KEYWORDS = {
  javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export'],
  typescript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'interface', 'type'],
  python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'return', 'try', 'except'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'if', 'else', 'for', 'while', 'return', 'import'],
  cpp: ['#include', 'int', 'float', 'double', 'char', 'void', 'if', 'else', 'for', 'while', 'return', 'class'],
  c: ['#include', 'int', 'float', 'double', 'char', 'void', 'if', 'else', 'for', 'while', 'return'],
  html: ['div', 'span', 'p', 'a', 'img', 'ul', 'li', 'h1', 'h2', 'h3', 'body', 'head'],
  css: ['color', 'background', 'margin', 'padding', 'border', 'width', 'height', 'display', 'flex'],
  sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'TABLE', 'INDEX'],
  go: ['func', 'var', 'const', 'if', 'else', 'for', 'range', 'return', 'struct', 'interface'],
  rust: ['fn', 'let', 'mut', 'if', 'else', 'for', 'while', 'return', 'struct', 'impl', 'trait'],
  php: ['function', 'class', 'if', 'else', 'for', 'while', 'return', 'public', 'private', 'protected']
}

const LANGUAGE_COLORS = {
  javascript: 'bg-yellow-500',
  typescript: 'bg-blue-500',
  python: 'bg-green-500',
  java: 'bg-orange-500',
  cpp: 'bg-purple-500',
  c: 'bg-gray-500',
  html: 'bg-red-500',
  css: 'bg-pink-500',
  json: 'bg-green-600',
  xml: 'bg-orange-600',
  yaml: 'bg-purple-600',
  sql: 'bg-indigo-500',
  go: 'bg-cyan-500',
  rust: 'bg-red-600',
  php: 'bg-indigo-600'
}

const LANGUAGE_MAP = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php'
}

interface UseCodeFormattingReturn {
  keywords: typeof LANGUAGE_KEYWORDS
  languageColors: typeof LANGUAGE_COLORS
  languageMap: typeof LANGUAGE_MAP
  formatCodeContent: (content: string, language: string) => string
  getLanguageColor: (language: string) => string
  clearFormattingCache: () => void
}

export function useCodeFormatting(): UseCodeFormattingReturn {
  // Cache for formatted code to prevent reprocessing
  const formattedCodeCache = useRef(new Map<string, string>())

  // Clear cache when it gets too large to prevent memory issues
  useEffect(() => {
    const clearCacheInterval = setInterval(() => {
      if (formattedCodeCache.current.size > 100) {
        formattedCodeCache.current.clear()
      }
    }, 60000) // Clear every minute if cache is large

    return () => clearInterval(clearCacheInterval)
  }, [])

  const formatCodeContent = useCallback((content: string, language: string) => {
    // Create cache key
    const cacheKey = `${content.length}-${language}-${content.substring(0, 100)}`
    
    // Check cache first
    if (formattedCodeCache.current.has(cacheKey)) {
      return formattedCodeCache.current.get(cacheKey)!
    }

    // Early return for large files to prevent performance issues
    if (content.length > 10000) {
      const truncated = content.substring(0, 10000) + '\n\n... (Content truncated for performance)'
      formattedCodeCache.current.set(cacheKey, truncated)
      return truncated
    }

    // Skip highlighting for very large files or when content is empty
    if (!content || content.length > 5000) {
      formattedCodeCache.current.set(cacheKey, content)
      return content
    }

    const langKeywords = LANGUAGE_KEYWORDS[language as keyof typeof LANGUAGE_KEYWORDS] || []
    
    if (langKeywords.length === 0) {
      formattedCodeCache.current.set(cacheKey, content)
      return content
    }

    // Use a more efficient approach - only highlight small chunks
    try {
      let highlighted = content
      
      // Only apply keyword highlighting for small files
      if (langKeywords.length > 0 && content.length < 3000) {
        const keywordPattern = `\\b(${langKeywords.slice(0, 10).join('|')})\\b` // Limit keywords
        const regex = new RegExp(keywordPattern, 'g')
        highlighted = highlighted.replace(regex, '<span class="text-blue-500 dark:text-blue-400 font-semibold">$1</span>')
      }

      formattedCodeCache.current.set(cacheKey, highlighted)
      return highlighted
    } catch (error) {
      // Fallback to plain content if highlighting fails
      formattedCodeCache.current.set(cacheKey, content)
      return content
    }
  }, [])

  const getLanguageColor = useCallback((language: string) => {
    return LANGUAGE_COLORS[language.toLowerCase() as keyof typeof LANGUAGE_COLORS] || 'bg-slate-500'
  }, [])

  const clearFormattingCache = useCallback(() => {
    formattedCodeCache.current.clear()
  }, [])

  return {
    keywords: LANGUAGE_KEYWORDS,
    languageColors: LANGUAGE_COLORS,
    languageMap: LANGUAGE_MAP,
    formatCodeContent,
    getLanguageColor,
    clearFormattingCache
  }
}
