import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded-lg bg-[var(--input-background)] border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
