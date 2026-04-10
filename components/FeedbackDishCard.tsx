'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Dish, FeedbackRating } from '@/types'

interface Props {
  dish: Dish
  rating: FeedbackRating | null
  note: string
  ratedAt: string | null
  disabled?: boolean
  onRating: (r: FeedbackRating | null) => void
  onNoteChange: (note: string) => void
}

const OPTIONS: { key: FeedbackRating; emoji: string; label: string; selected: string }[] = [
  { key: 'loved', emoji: '😍', label: 'Loved', selected: 'bg-primary border-primary text-primary-foreground shadow-md' },
  { key: 'ok', emoji: '😐', label: 'OK', selected: 'bg-muted border-muted-foreground text-foreground shadow-md' },
  {
    key: 'disliked',
    emoji: '👎',
    label: 'Disliked',
    selected: 'bg-destructive/10 border-destructive text-destructive shadow-md',
  },
]

export function FeedbackDishCard({ dish, rating, note, ratedAt, disabled, onRating, onNoteChange }: Props) {
  const [showNote, setShowNote] = useState(false)
  const [draft, setDraft] = useState(note)

  return (
    <Card className="p-3">
      <div className="flex gap-2">
        <div className="text-3xl flex-shrink-0">{dish.emoji || '🍽️'}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm mb-2 truncate">{dish.name}</div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {OPTIONS.map((o) => {
              const selected = rating === o.key
              return (
                <button
                  key={o.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onRating(selected ? null : o.key)}
                  className={cn(
                    'min-h-[36px] px-2 py-1.5 rounded-lg border-2 flex flex-col items-center justify-center transition disabled:opacity-50',
                    selected ? o.selected : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                  )}
                  aria-pressed={selected}
                >
                  <span className="text-lg leading-none">{o.emoji}</span>
                  <span className="text-[10px] mt-0.5">{o.label}</span>
                </button>
              )
            })}
          </div>

          {rating && (
            <div className="mb-1">
              {note && !showNote ? (
                <div
                  className="text-xs text-muted-foreground italic bg-secondary/50 rounded px-2 py-1 cursor-pointer"
                  onClick={() => !disabled && setShowNote(true)}
                >
                  {note}
                </div>
              ) : showNote ? (
                <div>
                  <Textarea
                    className="text-xs min-h-[48px]"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add a note…"
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="mt-1"
                    onClick={() => {
                      onNoteChange(draft)
                      setShowNote(false)
                    }}
                    disabled={disabled}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  disabled={disabled}
                  onClick={() => {
                    setDraft(note)
                    setShowNote(true)
                  }}
                >
                  <MessageSquare className="w-3 h-3" /> Add a note
                </Button>
              )}
            </div>
          )}

          {ratedAt && (
            <div className="text-[10px] text-muted-foreground">
              Rated on {new Date(ratedAt).toLocaleDateString('en-US')}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
