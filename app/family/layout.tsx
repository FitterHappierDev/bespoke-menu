import { ChefHat } from 'lucide-react'
import { FamilyDesktopNav, FamilyMobileNav } from '@/components/FamilyNav'

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-30 bg-card border-b border-border h-16 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-primary" />
          <span className="font-serif text-xl">Bespoke Menu Planner</span>
        </div>
        <FamilyDesktopNav />
      </header>
      <main className="p-4 md:p-6">{children}</main>
      <FamilyMobileNav />
    </div>
  )
}
