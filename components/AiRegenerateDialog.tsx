'use client'

import { useState } from 'react'
import { Wand2, Loader2 } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (custom: string) => void
  isGenerating: boolean
  defaultPrompt: string
}

export function AiRegenerateDialog({ open, onOpenChange, onGenerate, isGenerating, defaultPrompt }: Props) {
  const [custom, setCustom] = useState('')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          <Wand2 className="w-5 h-5 text-primary" /> Regenerate Menu with AI
        </DialogTitle>
        <DialogDescription>Review the current prompt or add custom instructions.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Current prompt</Label>
          <div className="mt-1 bg-secondary/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
            {defaultPrompt}
          </div>
        </div>
        <div>
          <Label>Additional instructions (optional)</Label>
          <Textarea
            className="mt-1"
            rows={3}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Include a lamb dish..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
          Cancel
        </Button>
        <Button onClick={() => onGenerate(custom)} disabled={isGenerating}>
          {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
          Generate Menu
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
