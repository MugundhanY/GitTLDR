'use client'
import { useEffect } from 'react'

export default function ThemeScript() {
  useEffect(() => {
    // Theme detection logic
    try {
      const theme = localStorage.getItem('theme') || 'system'
      let isDark = false
      
      if (theme === 'dark') {
        isDark = true
      } else if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } catch (e) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return null
}
