'use client'

import { useEffect, useRef, useState } from 'react'
import { FileStats } from './types'

interface LanguageDistributionProps {
  stats: FileStats
}

export default function LanguageDistribution({ stats }: LanguageDistributionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [animatedBars, setAnimatedBars] = useState(new Set<number>())
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
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
    
  return (    <div ref={containerRef} className={`transition-all duration-700 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
      {/* Enhanced horizontal bar with hover effects */}
      <div className="mb-4">
        <div className="flex rounded-lg overflow-hidden h-3 bg-slate-200 dark:bg-slate-700 shadow-inner relative">
          {sortedLanguages.slice(0, 6).map((lang, index) => {
            const percentage = (lang.count / stats.totalFiles) * 100
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
            const color = colors[index % colors.length]
            const isHovered = hoveredIndex === index
            const isDimmed = hoveredIndex !== null && hoveredIndex !== index
            
            return (
              <div
                key={lang.name}
                className={`transition-all duration-500 transform origin-left cursor-pointer relative group ${
                  animatedBars.has(index) 
                    ? 'scale-x-100' 
                    : 'scale-x-0'
                } ${
                  isHovered 
                    ? 'z-10 scale-y-150 shadow-lg' 
                    : isDimmed 
                      ? 'opacity-40 scale-y-75' 
                      : 'opacity-100 hover:scale-y-125'
                }`}
                style={{ 
                  width: `${percentage}%`, 
                  backgroundColor: color,
                  transitionDelay: `${index * 100}ms`,
                  filter: isHovered ? 'brightness(1.2) saturate(1.2)' : 'none',
                  boxShadow: isHovered ? `0 0 20px ${color}40` : 'none'
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                title={`${lang.name}: ${percentage.toFixed(1)}% (${lang.count} files)`}
              >
                {/* Subtle shine effect on hover */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transform -skew-x-12 transition-all duration-700 ${
                    isHovered ? 'opacity-30 translate-x-full' : '-translate-x-full'
                  }`}
                  style={{ 
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
                    transitionDelay: isHovered ? '200ms' : '0ms'
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>      {/* Enhanced legend with interactive highlighting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        {sortedLanguages.slice(0, 6).map((lang, index) => {
          const percentage = ((lang.count / stats.totalFiles) * 100).toFixed(1)
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
          const color = colors[index % colors.length]
          const isHovered = hoveredIndex === index
          const isDimmed = hoveredIndex !== null && hoveredIndex !== index
          
          return (
            <div 
              key={lang.name} 
              className={`flex items-center gap-2 transition-all duration-500 transform cursor-pointer rounded-lg px-2 py-1.5 relative group ${
                isVisible 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 translate-x-4'
              } ${
                isHovered 
                  ? 'scale-105 bg-slate-100 dark:bg-slate-800/50 shadow-md' 
                  : isDimmed 
                    ? 'opacity-50' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
              }`}
              style={{ transitionDelay: `${200 + (index * 100)}ms` }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Enhanced color indicator with glow effect */}
              <div 
                className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-500 relative ${
                  animatedBars.has(index) 
                    ? 'scale-100' 
                    : 'scale-0'
                } ${
                  isHovered 
                    ? 'scale-125 shadow-lg' 
                    : 'shadow-sm'
                }`}
                style={{ 
                  backgroundColor: color,
                  transitionDelay: `${300 + (index * 100)}ms`,
                  boxShadow: isHovered 
                    ? `0 0 16px ${color}60, 0 4px 8px ${color}30` 
                    : `0 2px 4px ${color}20`
                }}
              >
                {/* Pulse ring effect on hover */}
                <div 
                  className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                    isHovered ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: color,
                    filter: 'blur(1px)'
                  }}
                />
              </div>
              
              {/* Language name with enhanced typography */}
              <span className={`font-medium transition-all duration-300 ${
                isHovered 
                  ? 'text-slate-900 dark:text-white transform scale-105' 
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {lang.name || 'Unknown'}
              </span>
              
              {/* Percentage with subtle highlight */}
              <span className={`ml-auto font-mono transition-all duration-300 ${
                isHovered 
                  ? 'text-slate-900 dark:text-white font-semibold transform scale-110' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
                {percentage}%
              </span>
              
              {/* Subtle background highlight */}
              <div 
                className={`absolute inset-0 rounded-lg transition-all duration-300 -z-10 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ 
                  background: `linear-gradient(135deg, ${color}08, ${color}04)`,
                  border: `1px solid ${color}20`
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
