'use client'

import { useEffect, useRef, useState } from 'react'
import { FileStats } from './types'

interface LanguageDistributionProps {
  stats: FileStats
}

export default function LanguageDistribution({ stats }: LanguageDistributionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [animatedBars, setAnimatedBars] = useState(new Set<number>())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          // Trigger bar animations with staggered delays
          stats.languages.slice(0, 6).forEach((_, index) => {
            setTimeout(() => {
              setAnimatedBars(prev => {
                const newSet = new Set(prev);
                newSet.add(index);
                return newSet;
              })
            }, index * 150)
          })
        }
      },
      { 
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [stats.languages])

  if (stats.languages.length === 0) {
    return null
  }

  // Sort languages by count in descending order
  const sortedLanguages = [...stats.languages].sort((a, b) => b.count - a.count)
    
  return (
    <div ref={containerRef} className={`transition-all duration-700 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
      {/* Compact horizontal bar with scroll-triggered animations */}
      <div className="mb-3">
        <div className="flex rounded-lg overflow-hidden h-2 bg-slate-200 dark:bg-slate-700">
          {sortedLanguages.slice(0, 6).map((lang, index) => {
            const percentage = (lang.count / stats.totalFiles) * 100
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
            const color = colors[index % colors.length]
            
            return (
              <div
                key={lang.name}
                className={`transition-all duration-700 hover:opacity-80 transform origin-left ${
                  animatedBars.has(index) 
                    ? 'scale-x-100 opacity-100' 
                    : 'scale-x-0 opacity-50'
                }`}
                style={{ 
                  width: `${percentage}%`, 
                  backgroundColor: color,
                  transitionDelay: `${index * 100}ms`
                }}
                title={`${lang.name}: ${percentage.toFixed(1)}%`}
              />
            )
          })}
        </div>
      </div>

      {/* Compact legend with staggered animations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {sortedLanguages.slice(0, 6).map((lang, index) => {
          const percentage = ((lang.count / stats.totalFiles) * 100).toFixed(1)
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
          const color = colors[index % colors.length]
          
          return (
            <div 
              key={lang.name} 
              className={`flex items-center gap-2 transition-all duration-500 transform ${
                isVisible 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 translate-x-4'
              }`}
              style={{ transitionDelay: `${200 + (index * 100)}ms` }}
            >
              <div 
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${
                  animatedBars.has(index) 
                    ? 'scale-100 shadow-sm' 
                    : 'scale-0'
                }`}
                style={{ 
                  backgroundColor: color,
                  transitionDelay: `${300 + (index * 100)}ms`
                }}
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                {lang.name || 'Unknown'}
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-auto">
                {percentage}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
