import * as React from 'react'
import { cn } from '@/lib/utils'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100
}
export function Progress({ value, className, ...props }: Props) {
  return (
    <div className={cn('w-full h-2 bg-secondary rounded-full overflow-hidden', className)} {...props}>
      <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
