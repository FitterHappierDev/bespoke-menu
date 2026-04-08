'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'family' | 'chef'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('family')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      if (!res.ok) {
        setError('Incorrect passcode')
        return
      }
      const data = await res.json()
      router.push(data.role === 'family' ? '/family/menu' : '/chef/menu')
    } catch {
      setError('Incorrect passcode')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] bg-card rounded-xl shadow-lg p-10 text-center border border-border">
        <div className="flex justify-center mb-4">
          <ChefHat className="w-6 h-6 text-primary" />
        </div>
        <h1 className="font-serif text-2xl mb-1">Bespoke Menu Planner</h1>
        <p className="text-sm text-muted-foreground mb-6">Private Access</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['family', 'chef'] as Role[]).map((r) => {
            const selected = role === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'p-4 rounded-lg border-2 transition text-left',
                  selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'
                )}
              >
                <div className="text-2xl mb-1">{r === 'family' ? '🏡' : '👨‍🍳'}</div>
                <div className="text-xs font-bold uppercase tracking-wide">{r}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r === 'family' ? 'Plan, rate & manage' : 'View menu & propose'}
                </div>
              </button>
            )
          })}
        </div>

        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Enter passcode"
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--input-background)] border border-border text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="text-xs text-destructive mb-2">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={loading || !passcode}
          className="w-full mt-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          Enter
        </button>
      </div>
    </div>
  )
}
