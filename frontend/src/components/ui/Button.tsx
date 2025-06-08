import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'glass'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: React.ReactNode
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  gradient?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    leftIcon,
    rightIcon,
    fullWidth = false,
    gradient = false,
    children,
    disabled,
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 relative overflow-hidden group'
    
    const variants = {
      primary: gradient 
        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 focus:ring-primary-500 shadow-lg hover:shadow-xl hover:shadow-primary-500/25'
        : 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-lg hover:shadow-xl hover:shadow-primary-500/25',
      secondary: gradient
        ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white hover:from-secondary-600 hover:to-secondary-700 focus:ring-secondary-500 shadow-lg hover:shadow-xl hover:shadow-secondary-500/25'
        : 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 shadow-lg hover:shadow-xl hover:shadow-secondary-500/25',
      accent: gradient
        ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:from-accent-600 hover:to-accent-700 focus:ring-accent-500 shadow-lg hover:shadow-xl hover:shadow-accent-500/25'
        : 'bg-accent-500 text-white hover:bg-accent-600 focus:ring-accent-500 shadow-lg hover:shadow-xl hover:shadow-accent-500/25',
      ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:ring-neutral-500',
      outline: 'bg-transparent border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white focus:ring-primary-500',
      glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-neutral-800 hover:bg-white/20 focus:ring-primary-500 shadow-lg'
    }
    
    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
      xl: 'px-10 py-5 text-lg'
    }
    
    const LoadingSpinner = () => (
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
    )
    
    const ShimmerEffect = () => (
      <div className="absolute inset-0 -top-10 -bottom-10 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    )
    
    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {(variant === 'primary' || variant === 'secondary' || variant === 'accent') && <ShimmerEffect />}        <span className="relative z-10 flex items-center">
          {loading && <LoadingSpinner />}
          {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
          {!loading && icon && <span className="mr-2">{icon}</span>}
          {children}
          {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
