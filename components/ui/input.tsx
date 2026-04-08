import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg bg-[var(--input-background)] border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
