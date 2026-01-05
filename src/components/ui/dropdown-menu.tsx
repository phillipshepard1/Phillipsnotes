import * as React from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null)

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const context = React.useContext(DropdownMenuContext)
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu')

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    context.setOpen(!context.open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: handleClick,
    })
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({ children, align = 'end' }: { children: React.ReactNode; align?: 'start' | 'end' }) {
  const context = React.useContext(DropdownMenuContext)
  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu')

  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        context.setOpen(false)
      }
    }
    if (context.open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [context.open, context])

  if (!context.open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-1 min-w-[160px] bg-popover rounded-lg shadow-lg border border-border py-1',
        'animate-in fade-in-0 zoom-in-95',
        align === 'end' ? 'right-0' : 'left-0'
      )}
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export function DropdownMenuItem({ children, onClick, variant = 'default', disabled }: DropdownMenuItemProps) {
  const context = React.useContext(DropdownMenuContext)
  if (!context) throw new Error('DropdownMenuItem must be used within DropdownMenu')

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    context.setOpen(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-popover-foreground',
        'hover:bg-accent transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10'
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-border my-1" />
}
