'use client'

import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ChefProposal } from '@/types'

interface Props {
  proposal: ChefProposal
  onAccept: () => void
  onDecline: () => void
}

export function ChefProposalCard({ proposal, onAccept, onDecline }: Props) {
  return (
    <Card className="p-3 border-primary/30 bg-primary/5">
      <div className="flex gap-3">
        <div className="text-3xl leading-none pt-0.5">{proposal.emoji || '🍽️'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="font-medium text-sm truncate">{proposal.dish_name}</div>
            <Badge variant="outline">Chef&apos;s Proposal</Badge>
          </div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {proposal.ingredients?.slice(0, 6).map((ing, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                {ing}
              </Badge>
            ))}
          </div>
          {proposal.chef_notes && (
            <div className="text-xs text-muted-foreground italic mb-2">&ldquo;{proposal.chef_notes}&rdquo;</div>
          )}
          <div className="flex gap-1 items-center">
            {proposal.status === 'proposed' && (
              <>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={onAccept} aria-label="Accept">
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={onDecline} aria-label="Decline">
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </>
            )}
            {proposal.status === 'accepted' && <Badge variant="success">Accepted</Badge>}
            {proposal.status === 'declined' && <Badge variant="destructive">Declined</Badge>}
          </div>
        </div>
      </div>
    </Card>
  )
}
