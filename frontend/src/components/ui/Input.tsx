import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  variant?: 'default' | 'glass' | 'floating'
  isLoading?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helpText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      variant = 'default',
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const isFloating = variant === 'floating'
    const hasValue = props.value || props.defaultValue

    const baseInputClasses = 'w-full transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variantClasses = {
      default: 'bg-white border border-neutral-300 rounded-lg px-4 py-3 text-neutral-900 placeholder:text-neutral-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
      glass: 'bg-glass border border-white/40 backdrop-blur-xl rounded-xl px-4 py-3 text-neutral-900 placeholder:text-neutral-500 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20',
      floating: 'bg-transparent border-0 border-b-2 border-neutral-300 rounded-none px-0 py-3 text-neutral-900 placeholder:text-transparent focus:border-primary-500 focus:ring-0'
    }

    const iconPadding = {
      left: LeftIcon ? (variant === 'floating' ? 'pl-6' : 'pl-12') : '',
      right: RightIcon ? (variant === 'floating' ? 'pr-6' : 'pr-12') : ''
    }

    return (
      <div className="relative">
        {/* Standard Label */}
        {label && !isFloating && (
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {LeftIcon && (
            <div className={cn(
              'absolute left-0 top-0 h-full flex items-center justify-center pointer-events-none',
              variant === 'floating' ? 'w-6' : 'w-12'
            )}>
              <LeftIcon className={cn(
                'text-neutral-500',
                variant === 'floating' ? 'w-4 h-4' : 'w-5 h-5'
              )} />
            </div>
          )}

          {/* Input */}
          <input
            type={type}
            className={cn(
              baseInputClasses,
              variantClasses[variant],
              iconPadding.left,
              iconPadding.right,
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              className
            )}
            ref={ref}
            disabled={disabled || isLoading}
            {...props}
          />          {/* Floating Label */}
          {isFloating && label && (
            <label className={cn(
              'absolute left-0 top-3 text-neutral-500 transition-all duration-200 pointer-events-none origin-left',
              hasValue || (typeof ref !== 'function' && ref?.current && document.activeElement === ref.current)
                ? 'transform -translate-y-6 scale-75 text-primary-600'
                : 'transform translate-y-0 scale-100'
            )}>
              {label}
            </label>
          )}

          {/* Right Icon */}
          {RightIcon && (
            <div className={cn(
              'absolute right-0 top-0 h-full flex items-center justify-center pointer-events-none',
              variant === 'floating' ? 'w-6' : 'w-12'
            )}>
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RightIcon className={cn(
                  'text-neutral-500',
                  variant === 'floating' ? 'w-4 h-4' : 'w-5 h-5'
                )} />
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-error-600 animate-fade-in-up">
            {error}
          </p>
        )}

        {/* Help Text */}
        {helpText && !error && (
          <p className="mt-2 text-sm text-neutral-500">
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
