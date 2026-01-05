import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CircularButtonProps {
  variant?: 'default' | 'primary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  title?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
}

const variantClasses = {
  default: 'bg-secondary/80 text-secondary-foreground active:bg-secondary',
  primary: 'bg-primary text-primary-foreground active:bg-primary/90',
  ghost: 'bg-transparent text-foreground active:bg-secondary/50',
}

export function CircularButton({
  variant = 'default',
  size = 'md',
  className,
  children,
  onClick,
  disabled,
  title,
}: CircularButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center justify-center rounded-full transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.button>
  )
}
