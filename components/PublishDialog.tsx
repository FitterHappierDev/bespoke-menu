'use client'

import { Loader2 } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPublishing: boolean
}

export function PublishDialog({ open, onOpenChange, onConfirm, isPublishing }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Publish menu to chef?</DialogTitle>
        <DialogDescription>
          Once published, the menu will be locked. You won&apos;t be able to regenerate or edit dishes for this week.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isPublishing}>
          {isPublishing && <Loader2 className="w-4 h-4 animate-spin" />}
          Publish to Chef
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
