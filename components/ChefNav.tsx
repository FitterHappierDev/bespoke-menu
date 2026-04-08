'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/chef/menu', label: 'Kitchen Menu' },
  { href: '/chef/propose', label: 'Propose Dishes' },
]

export function ChefDesktopNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'px-3 py-2 rounded-lg text-sm transition',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
