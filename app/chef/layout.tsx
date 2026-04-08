import { ChefHat } from 'lucide-react'
import { ChefDesktopNav } from '@/components/ChefNav'

export default function ChefLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card border-b border-border h-16 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-primary" />
          <span className="font-serif text-xl">Bespoke Menu Planner</span>
        </div>
        <ChefDesktopNav />
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  )
}
