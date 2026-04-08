import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'info' | 'destructive'
const variants: Record<Variant, string> = {
  default: 'bg-secondary text-foreground',
  info: 'bg-primary/10 text-foreground border-primary/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
}
export function Alert({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return <div className={cn('rounded-lg border border-border p-3 text-sm', variants[variant], className)} {...props} />
}
