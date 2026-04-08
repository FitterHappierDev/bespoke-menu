'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Dish } from '@/types'

export interface ChefDishCardData extends Dish {
  familyNote?: string
  previousRating?: 'loved' | 'ok' | 'disliked' | null
  previousNote?: string
  lastServed?: string | null
  chefNote?: string
}

interface Props {
  dish: ChefDishCardData
  readOnly: boolean
  onSaveNote: (note: string) => void
}

const RATING_EMOJI: Record<string, string> = { loved: '😍', ok: '😐', disliked: '👎' }

export function ChefDishCard({ dish, readOnly, onSaveNote }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(dish.chefNote ?? '')

  return (
    <Card className="p-6">
      <div className="flex gap-4">
        <div className="text-4xl flex-shrink-0">{dish.emoji || '🍽️'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="font-medium text-base">{dish.name}</div>
            {dish.recipe_url && (
              <a
                href={dish.recipe_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-secondary"
                aria-label="Open recipe"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            <Badge variant="outline">{dish.type === 'protein' ? 'Protein' : 'Vegetable'}</Badge>
            {(dish.tags ?? []).map((t, i) => (
              <Badge key={i} variant="outline">
                {t}
              </Badge>
            ))}
          </div>

          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Ingredients:</div>
            <div className="text-sm">{(dish.ingredients ?? []).join(', ')}</div>
          </div>

          {dish.familyNote && (
            <div className="bg-secondary rounded-lg p-3 mb-3">
              <div className="text-xs text-muted-foreground mb-1">Family Note</div>
              <div className="text-sm italic">{dish.familyNote}</div>
            </div>
          )}

          {dish.previousRating && (
            <div className="bg-accent/50 rounded-lg p-3 mb-3">
              <div className="text-xs text-muted-foreground mb-1">
                Last served {dish.lastServed ? new Date(dish.lastServed).toLocaleDateString('en-US') : ''}
              </div>
              <div className="text-sm flex items-center gap-2">
                <span className="text-lg">{RATING_EMOJI[dish.previousRating]}</span>
                {dish.previousNote && <span className="italic">&ldquo;{dish.previousNote}&rdquo;</span>}
              </div>
            </div>
          )}

          <div>
            {readOnly ? (
              dish.chefNote ? (
                <div className="bg-primary/10 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Chef Note</div>
                  <div className="text-sm italic">{dish.chefNote}</div>
                </div>
              ) : null
            ) : editing ? (
              <div>
                <Textarea
                  className="text-sm min-h-[64px]"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a chef note…"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onSaveNote(draft)
                      setEditing(false)
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : dish.chefNote ? (
              <div className="bg-primary/10 rounded-lg p-3 cursor-pointer" onClick={() => setEditing(true)}>
                <div className="text-xs text-muted-foreground mb-1">Chef Note (click to edit)</div>
                <div className="text-sm italic">{dish.chefNote}</div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                + Add chef note
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
