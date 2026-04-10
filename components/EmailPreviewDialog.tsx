'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailHtml: string
}

export function EmailPreviewDialog({ open, onOpenChange, emailHtml }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([emailHtml], { type: 'text/html' }),
          'text/plain': new Blob([emailHtml], { type: 'text/plain' }),
        }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: copy as plain text
      await navigator.clipboard.writeText(emailHtml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Chef Email Ready</DialogTitle>
        <DialogDescription>
          Copy the email below and paste it into Gmail. The formatting will be preserved.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-white">
        <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button onClick={copyToClipboard}>
          {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
          {copied ? 'Copied!' : 'Copy Email'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
