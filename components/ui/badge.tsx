import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'outline' | 'secondary' | 'destructive' | 'success'
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}
const variants: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground',
  outline: 'border border-border text-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'bg-primary/15 text-primary',
}
export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-medium', variants[variant], className)}
      {...props}
    />
  )
}
