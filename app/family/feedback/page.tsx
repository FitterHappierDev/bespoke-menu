'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FeedbackDishCard } from '@/components/FeedbackDishCard'
import { formatWeekLabel, offsetWeek } from '@/lib/weekUtils'
import type { Dish, MenuItem, WeeklyMenu, DailyFeedback, FeedbackRating } from '@/types'

interface FeedbackData {
  menu: WeeklyMenu | null
  items: (MenuItem & { dish: Dish })[]
  feedback: DailyFeedback[]
}

export default function FeedbackPage() {
  const [anchor, setAnchor] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [data, setData] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/week?current=true')
      const { week_start } = await res.json()
      setAnchor(week_start)
      setWeekStart(week_start)
    })()
  }, [])

  useEffect(() => {
    if (anchor) setWeekStart(offsetWeek(anchor, weekOffset))
  }, [anchor, weekOffset])

  const fetchData = useCallback(async () => {
    if (!weekStart) return
    setLoading(true)
    try {
      const res = await fetch(`/api/feedback?week_start=${weekStart}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!weekStart) return <div className="text-sm text-muted-foreground">Loading...</div>

  const items = data?.items ?? []
  const feedbackByItem = new Map((data?.feedback ?? []).map((f) => [f.menu_item_id, f]))

  const submitted = data?.menu?.status === 'feedback_submitted'
  const ratedCount = (data?.feedback ?? []).filter((f) => f.rating).length
  const total = items.length
  const loved = (data?.feedback ?? []).filter((f) => f.rating === 'loved').length
  const okCount = (data?.feedback ?? []).filter((f) => f.rating === 'ok').length
  const disliked = (data?.feedback ?? []).filter((f) => f.rating === 'disliked').length

  async function saveRating(item: MenuItem & { dish: Dish }, rating: FeedbackRating | null) {
    const prev = feedbackByItem.get(item.id)
    // optimistic
    setData((d) => {
      if (!d) return d
      const list = d.feedback.map((f) =>
        f.menu_item_id === item.id ? { ...f, rating, rated_at: rating ? new Date().toISOString() : null } : f
      )
      return { ...d, feedback: list }
    })
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu_item_id: item.id, rating }),
    })
    if (!res.ok) {
      toast.error('Failed to save rating')
      // rollback
      if (prev)
        setData((d) => {
          if (!d) return d
          return { ...d, feedback: d.feedback.map((f) => (f.menu_item_id === item.id ? prev : f)) }
        })
    }
  }

  async function saveNote(item: MenuItem & { dish: Dish }, note: string) {
    setData((d) => {
      if (!d) return d
      return { ...d, feedback: d.feedback.map((f) => (f.menu_item_id === item.id ? { ...f, note } : f)) }
    })
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu_item_id: item.id, note }),
    })
  }

  async function submitBatch() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Submit failed' }))
        toast.error(error || 'Submit failed')
        return
      }
      toast.success('Feedback submitted')
      setSubmitOpen(false)
      await fetchData()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !data) return <div className="text-sm text-muted-foreground">Loading…</div>

  if (!data?.menu || items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-serif text-3xl md:text-4xl mb-1">Rate This Week</h1>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{formatWeekLabel(weekStart)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={weekOffset >= 0}
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">No menu published yet for this week.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <h1 className="font-serif text-3xl md:text-4xl mb-1">Rate This Week</h1>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((o) => o - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground">{formatWeekLabel(weekStart)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={weekOffset >= 0}
          onClick={() => setWeekOffset((o) => o + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {ratedCount} of {total} rated
          </span>
        </div>
        <Progress value={total ? (ratedCount / total) * 100 : 0} className="mb-4" />
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div>
            <div className="text-2xl font-serif">😍 {loved}</div>
          </div>
          <div>
            <div className="text-2xl font-serif">😐 {okCount}</div>
          </div>
          <div>
            <div className="text-2xl font-serif">👎 {disliked}</div>
          </div>
        </div>
        <Button
          className="w-full"
          disabled={ratedCount === 0 || submitted}
          onClick={() => setSubmitOpen(true)}
        >
          {submitted ? 'Feedback Submitted' : `Submit Feedback (${ratedCount} dishes)`}
        </Button>
      </Card>

      <div className="space-y-3">
        {items.map((item) => {
          const f = feedbackByItem.get(item.id)
          return (
            <FeedbackDishCard
              key={item.id}
              dish={item.dish}
              rating={(f?.rating as FeedbackRating | null) ?? null}
              note={f?.note ?? ''}
              ratedAt={f?.rated_at ?? null}
              disabled={submitted}
              onRating={(r) => saveRating(item, r)}
              onNoteChange={(n) => saveNote(item, n)}
            />
          )
        })}
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogHeader>
          <DialogTitle>Submit feedback?</DialogTitle>
          <DialogDescription>
            😍 {loved} loved · 😐 {okCount} ok · 👎 {disliked} disliked. Once submitted, you won&apos;t be able to edit
            these ratings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submitBatch} disabled={submitting}>
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
