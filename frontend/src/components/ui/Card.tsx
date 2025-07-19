import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'premium' | 'subtle'
  hover?: boolean
}

export function Card({ children, className, variant = 'default', hover = true }: CardProps) {
  const baseClasses = 'rounded-2xl transition-all duration-300'
  
  const variants = {
    default: 'bg-white border border-neutral-200 shadow-sm',
    glass: 'bg-glass border border-white/40 backdrop-blur-xl shadow-lg',
    premium: 'bg-gradient-to-br from-white to-primary-50 border border-primary-200/50 shadow-xl',
    subtle: 'bg-neutral-50/80 border border-neutral-200/60 shadow-sm'
  }

  const hoverEffects = hover ? 'hover:scale-[1.02] hover:shadow-xl' : ''

  return (
    <div className={cn(baseClasses, variants[variant], hoverEffects, className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('p-6 pb-4', className)}>
      {children}
    </div>
  )
}

export function CardContent({ children, className }: CardProps) {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn('text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-white', className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className }: CardProps) {
  return (
    <p className={cn('text-sm text-slate-500 dark:text-slate-400 mt-1.5', className)}>
      {children}
    </p>
  )
}
