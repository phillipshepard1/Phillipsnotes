import { cn } from '@/lib/utils'

interface LargeTitleProps {
  title: string
  subtitle?: string
  className?: string
}

export function LargeTitle({ title, subtitle, className }: LargeTitleProps) {
  return (
    <div className={cn('px-4', className)}>
      <h1 className="text-[34px] font-bold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-0.5 text-base text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  )
}
