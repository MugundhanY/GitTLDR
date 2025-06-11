'use client'

import { useEffect, useRef, useState } from 'react'
import { FileStats } from './types'

interface FileStatisticsProps {
  stats: FileStats
  formatFileSize: (bytes?: number) => string
}

export default function FileStatistics({ stats, formatFileSize }: FileStatisticsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [animatedCards, setAnimatedCards] = useState(new Set<number>())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Trigger card animations with staggered delays
          [0, 1, 2, 3].forEach((index) => {
            setTimeout(() => {
              setAnimatedCards(prev => {
                const newSet = new Set(prev);
                newSet.add(index);
                return newSet;
              })
            }, index * 150)
          })
        }
      },
      { 
        threshold: 0.2,
        rootMargin: '0px 0px -20px 0px'
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const cardData = [
    {
      label: 'Total Files',
      value: stats.totalFiles.toLocaleString(),
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      label: 'Directories',
      value: stats.totalDirectories.toLocaleString(),
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      label: 'Languages',
      value: stats.languages.length.toString(),
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      label: 'Total Size',
      value: formatFileSize(stats.totalSize),
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7c0 2.21-3.582 4-8 4s-8-1.79-8-4z" />
        </svg>
      ),
      gradient: 'from-orange-500 to-red-500'
    }
  ]

  return (
    <div 
      ref={containerRef}
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 transition-all duration-700 ${
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
      }`}
    >
      {cardData.map((card, index) => (
        <div
          key={card.label}
          className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-all duration-500 transform ${
            animatedCards.has(index) 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-4 scale-95'
          } hover:scale-105 hover:-translate-y-1 cursor-pointer group`}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
              {card.icon}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors duration-200 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                {card.label}
              </p>
              <p className={`text-3xl font-bold text-slate-900 dark:text-white transition-all duration-300 ${
                animatedCards.has(index) ? 'transform translate-y-0' : 'transform translate-y-2'
              }`}>
                {card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
