import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface FilterOption {
  value: string
  label: string
  color?: string
}

interface MultiSelectFilterProps {
  options: FilterOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder = 'Filter...',
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectAll = () => {
    onChange(options.map((o) => o.value))
  }

  const clearAll = () => {
    onChange([])
  }

  const displayText =
    selected.length === 0
      ? placeholder
      : `${selected.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full justify-between text-xs font-normal"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {/* Actions */}
        <div className="flex gap-1 mb-2 pb-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs flex-1"
            onClick={selectAll}
          >
            Select all
          </Button>
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs flex-1"
              onClick={clearAll}
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Options */}
        <div className="space-y-1 max-h-48 overflow-auto">
          {options.map((option) => {
            const isSelected = selected.includes(option.value)
            return (
              <div
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
                onClick={() => toggleOption(option.value)}
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary' : 'border-input'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                {option.color && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span className="text-xs">{option.label}</span>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
