import { Check, X } from 'lucide-react'
import { FOLDER_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface FolderColorPickerProps {
  selectedColor: string | null
  onColorSelect: (color: string | null) => void
  className?: string
}

export function FolderColorPicker({ selectedColor, onColorSelect, className }: FolderColorPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2 p-2', className)}>
      {/* Remove color option */}
      <button
        onClick={() => onColorSelect(null)}
        className={cn(
          'h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all',
          'hover:scale-110',
          selectedColor === null
            ? 'border-primary bg-muted'
            : 'border-border bg-background'
        )}
        title="No color"
      >
        {selectedColor === null ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Color swatches */}
      {FOLDER_COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => onColorSelect(color.value)}
          className={cn(
            'h-7 w-7 rounded-full transition-all flex items-center justify-center',
            'hover:scale-110',
            selectedColor === color.value && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
          )}
          style={{ backgroundColor: color.value }}
          title={color.name}
        >
          {selectedColor === color.value && (
            <Check className="h-3.5 w-3.5 text-white drop-shadow-md" />
          )}
        </button>
      ))}
    </div>
  )
}
