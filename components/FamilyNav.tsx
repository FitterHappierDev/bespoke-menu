'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, FileText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/family/menu', label: 'This Week', icon: Home },
  { href: '/family/feedback', label: 'Feedback', icon: Clock },
  { href: '/family/history', label: 'History', icon: FileText },
  { href: '/family/settings', label: 'Settings', icon: Settings },
]

export function FamilyDesktopNav() {
  const pathname = usePathname()
  return (
    <nav className="hidden md:flex items-center gap-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function FamilyMobileNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border h-16 flex z-40">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px]',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
