'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, ExternalLink, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Dish } from '@/types'

interface HistoryDish extends Dish {
  lastRating: 'loved' | 'ok' | 'disliked' | null
  lastNote: string
  lastServed: string | null
  timesServed: number
}

const RATING_EMOJI: Record<string, string> = { loved: '😍', ok: '😐', disliked: '👎' }

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''))
    return row
  })
}

export default function HistoryPage() {
  const [dishes, setDishes] = useState<HistoryDish[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | 'protein' | 'veg'>('all')
  const [rating, setRating] = useState<'all' | 'loved' | 'ok' | 'disliked'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchDishes = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (type !== 'all') sp.set('type', type)
      if (rating !== 'all') sp.set('rating', rating)
      if (q) sp.set('q', q)
      const res = await fetch(`/api/dishes?${sp}`)
      const json = await res.json()
      setDishes(json.dishes ?? [])
    } catch {
      toast.error('Failed to load dishes')
    } finally {
      setLoading(false)
    }
  }, [type, rating, q])

  useEffect(() => {
    const t = setTimeout(fetchDishes, 200)
    return () => clearTimeout(t)
  }, [fetchDishes])

  async function importCSV(file: File) {
    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length === 0) {
      toast.error('No rows in CSV')
      return
    }
    const dishesPayload = rows.map((r) => ({
      name: r.name || r.dish_name,
      type: (r.type ?? 'protein').toLowerCase().startsWith('v') ? 'veg' : 'protein',
      ingredients: (r.ingredients ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
      recipe_url: r.recipe_url ?? r.url ?? '',
      description: r.description ?? '',
      rating: r.rating || undefined,
      note: r.note ?? '',
      emoji: r.emoji || '🍽️',
    }))
    const res = await fetch('/api/dishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishes: dishesPayload }),
    })
    if (!res.ok) {
      toast.error('Import failed')
      return
    }
    const json = await res.json()
    toast.success(`Imported ${json.imported} dish${json.imported === 1 ? '' : 'es'}`)
    if (fileRef.current) fileRef.current.value = ''
    fetchDishes()
  }

  const total = dishes.length
  const loved = dishes.filter((d) => d.lastRating === 'loved').length
  const ok = dishes.filter((d) => d.lastRating === 'ok').length
  const disliked = dishes.filter((d) => d.lastRating === 'disliked').length

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl md:text-4xl">Dish History</h1>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" /> Import CSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importCSV(f)
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-serif">{total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-serif">😍 {loved}</div>
          <div className="text-xs text-muted-foreground">Loved</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-serif">😐 {ok}</div>
          <div className="text-xs text-muted-foreground">OK</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-serif">👎 {disliked}</div>
          <div className="text-xs text-muted-foreground">Disliked</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search dishes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={rating} onChange={(e) => setRating(e.target.value as any)}>
            <option value="all">All ratings</option>
            <option value="loved">😍 Loved</option>
            <option value="ok">😐 OK</option>
            <option value="disliked">👎 Disliked</option>
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="all">All types</option>
            <option value="protein">Proteins</option>
            <option value="veg">Vegetables</option>
          </Select>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : dishes.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10">
          No dishes found matching your filters.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {dishes.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex gap-3">
                <div className="text-3xl flex-shrink-0">{d.emoji || '🍽️'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium text-sm truncate">{d.name}</div>
                    {d.lastRating && <span className="text-base">{RATING_EMOJI[d.lastRating]}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant="outline">{d.type === 'protein' ? 'Protein' : 'Vegetable'}</Badge>
                    {(d.tags ?? []).map((t, i) => (
                      <Badge key={i} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-2">
                    {d.lastServed ? `Last served ${new Date(d.lastServed).toLocaleDateString('en-US')}` : 'Not yet rated'}
                    {d.timesServed > 0 && ` · served ${d.timesServed}×`}
                  </div>
                  {d.lastNote && (
                    <div className="text-xs italic bg-secondary/50 rounded px-2 py-1 mb-2">{d.lastNote}</div>
                  )}
                  {d.recipe_url && (
                    <a
                      href={d.recipe_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Recipe
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
