'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ChefDishCard, type ChefDishCardData } from '@/components/ChefDishCard'
import { supabase } from '@/lib/supabase-client'
import { getWeekStart, formatWeekLabel } from '@/lib/weekUtils'
import type { Dish, MenuItem, WeeklyMenu } from '@/types'

interface ChefMenuData {
  menu: WeeklyMenu | null
  protein_items: (MenuItem & { dish: Dish })[]
  veg_items: (MenuItem & { dish: Dish })[]
  dish_history: Record<string, { rating: string | null; note: string; rated_at: string | null }>
}

export default function ChefMenuPage() {
  const [weekStart] = useState(() => getWeekStart())
  const [data, setData] = useState<ChefMenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [chefNotes, setChefNotes] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/menu?week_start=${weekStart}&include=history`)
      const json = await res.json()
      setData(json)
      setChefNotes((json.menu?.chef_notes as Record<string, string>) || {})
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-time: refresh when weekly_menus row for this week changes
  useEffect(() => {
    const channel = supabase
      .channel(`weekly_menus_${weekStart}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_menus', filter: `week_start=eq.${weekStart}` },
        () => fetchData()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekStart, fetchData])

  async function saveChefNote(dishId: string, note: string) {
    if (!data?.menu) return
    const prev = chefNotes
    setChefNotes({ ...prev, [dishId]: note })
    const res = await fetch(`/api/menus/${data.menu.id}/chef-notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dish_id: dishId, note }),
    })
    if (!res.ok) {
      toast.error('Failed to save note')
      setChefNotes(prev)
    }
  }

  async function confirmMenu() {
    if (!data?.menu) return
    setConfirming(true)
    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: data.menu.id, chef_notes: chefNotes }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Confirm failed' }))
        toast.error(error || 'Confirm failed')
        return
      }
      toast.success('Menu confirmed ✓')
      setConfirmOpen(false)
      await fetchData()
    } finally {
      setConfirming(false)
    }
  }

  if (loading && !data) return <div className="text-sm text-muted-foreground">Loading…</div>

  if (!data?.menu || data.menu.status === 'draft') {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Kitchen Menu</h1>
        <p className="text-sm text-muted-foreground">{formatWeekLabel(weekStart)}</p>
        <p className="text-sm text-muted-foreground mt-6">The family hasn&apos;t published this week&apos;s menu yet.</p>
      </div>
    )
  }

  const status = data.menu.status
  const isPublished = status === 'published'
  const isConfirmed = status === 'confirmed' || status === 'feedback_open' || status === 'feedback_submitted'

  const renderCards = (items: (MenuItem & { dish: Dish })[]) =>
    items.map((item) => {
      const history = data.dish_history?.[item.dish_id]
      const cardData: ChefDishCardData = {
        ...item.dish,
        familyNote: item.family_note,
        previousRating: (history?.rating as any) ?? null,
        previousNote: history?.note,
        lastServed: history?.rated_at ?? null,
        chefNote: chefNotes[item.dish_id] ?? '',
      }
      return (
        <ChefDishCard
          key={item.id}
          dish={cardData}
          readOnly={!isPublished}
          onSaveNote={(note) => saveChefNote(item.dish_id, note)}
        />
      )
    })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Kitchen Menu</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-muted-foreground">{formatWeekLabel(weekStart)}</span>
            {isPublished && <Badge variant="outline">Published</Badge>}
            {isConfirmed && <Badge variant="success">Confirmed</Badge>}
          </div>
        </div>
        {isPublished && (
          <Button onClick={() => setConfirmOpen(true)}>Confirm Menu</Button>
        )}
      </div>

      {isPublished && (
        <Alert variant="info" className="mb-6">
          The family has published this week&apos;s menu. Review all dishes and confirm when ready.
        </Alert>
      )}

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-serif text-xl">Proteins</h2>
          <Badge variant="outline">{data.protein_items.length}</Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-4">{renderCards(data.protein_items)}</div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-serif text-xl">Vegetables</h2>
          <Badge variant="outline">{data.veg_items.length}</Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-4">{renderCards(data.veg_items)}</div>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>
          <DialogTitle>Confirm this week&apos;s menu?</DialogTitle>
          <DialogDescription>
            {data.protein_items.length} proteins · {data.veg_items.length} vegetables. Your chef notes will be saved
            with the menu.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={confirmMenu} disabled={confirming}>
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
