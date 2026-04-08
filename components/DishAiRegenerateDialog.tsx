'use client'

import { useState, useEffect } from 'react'
import { Wand2, Loader2 } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Dish } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (custom: string) => void
  isGenerating: boolean
  dish: Dish | null
}

export function DishAiRegenerateDialog({ open, onOpenChange, onGenerate, isGenerating, dish }: Props) {
  const [custom, setCustom] = useState('')
  useEffect(() => {
    if (open) setCustom('')
  }, [open])
  if (!dish) return null
  const label = dish.type === 'protein' ? 'Protein' : 'Vegetable'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          <Wand2 className="w-5 h-5 text-primary" /> Regenerate {label} with AI
        </DialogTitle>
        <DialogDescription>Regenerate &ldquo;{dish.name}&rdquo; with optional custom instructions.</DialogDescription>
      </DialogHeader>
      <div>
        <Label>Custom instructions (optional)</Label>
        <Textarea
          className="mt-1"
          rows={3}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="e.g. Make it spicier, use chicken thighs..."
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
          Cancel
        </Button>
        <Button onClick={() => onGenerate(custom)} disabled={isGenerating}>
          {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
          Generate Dish
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
