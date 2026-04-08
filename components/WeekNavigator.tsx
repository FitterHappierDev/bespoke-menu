'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canNavigateForward, formatWeekLabel } from '@/lib/weekUtils'
import { cn } from '@/lib/utils'

interface Props {
  weekStart: string
  offset: number
  onNavigate: (newOffset: number) => void
}

export function WeekNavigator({ weekStart, offset, onNavigate }: Props) {
  const forwardDisabled = !canNavigateForward(offset)
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={() => onNavigate(offset - 1)}
        aria-label="Previous week"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-muted-foreground">{formatWeekLabel(weekStart)}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn('h-6 w-6', forwardDisabled && 'opacity-30 pointer-events-none')}
        disabled={forwardDisabled}
        onClick={() => onNavigate(offset + 1)}
        aria-label="Next week"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
