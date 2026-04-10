'use client'

import { useState } from 'react'
import { Wand2, Edit2, ExternalLink, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Dish } from '@/types'

interface DishCardProps {
  dish: Dish
  note: string
  isPublished: boolean
  onNoteChange: (note: string) => void
  onRegenerate: () => void
  onEdit: () => void
}

export function DishCard({ dish, note, isPublished, onNoteChange, onRegenerate, onEdit }: DishCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [draftNote, setDraftNote] = useState(note)

  return (
    <Card className="p-3 h-full hover:shadow-md transition-all duration-200">
      <div className="flex gap-3">
        <div className="text-3xl leading-none pt-0.5">{dish.emoji || '🍽️'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium text-sm truncate">{dish.name}</div>
            {dish.is_new && <Badge className="bg-primary text-[10px] px-1.5 py-0">New</Badge>}
          </div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {dish.ingredients?.slice(0, 6).map((ing, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                {ing}
              </Badge>
            ))}
          </div>
          <div className="text-xs text-muted-foreground italic mb-2">{dish.description}</div>
          {note && !showNoteInput && (
            <div className="text-xs text-muted-foreground italic bg-secondary/50 rounded px-2 py-1 mb-2">{note}</div>
          )}
          {showNoteInput && (
            <div className="mb-2">
              <Textarea
                className="text-xs min-h-[48px]"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Add a note for chef…"
              />
              <Button
                type="button"
                size="sm"
                className="mt-1"
                onClick={() => {
                  onNoteChange(draftNote)
                  setShowNoteInput(false)
                }}
              >
                Done
              </Button>
            </div>
          )}
          <div className="flex gap-1 items-center">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-7 w-7"
              disabled={isPublished}
              onClick={onRegenerate}
              aria-label="Regenerate dish"
            >
              <Wand2 className="w-3 h-3" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-7 w-7"
              disabled={isPublished}
              onClick={onEdit}
              aria-label="Edit dish"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            {dish.recipe_url && (
              <a
                href={dish.recipe_url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-secondary"
                aria-label="Open recipe"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={dish.recipe_url ? 'h-7 w-7' : 'h-7 w-7 ml-auto'}
              onClick={() => setShowNoteInput((s) => !s)}
              aria-label="Toggle note"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
