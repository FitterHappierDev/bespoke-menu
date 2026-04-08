import type { MenuStatus, UIState } from '@/types'

const VALID_TRANSITIONS: Record<MenuStatus, MenuStatus[]> = {
  draft: ['published'],
  published: ['confirmed'],
  confirmed: ['feedback_open'],
  feedback_open: ['feedback_submitted'],
  feedback_submitted: [],
}

export function canTransition(from: MenuStatus, to: MenuStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getUIState(status: MenuStatus | null): UIState {
  return {
    canGenerate: status === null || status === 'draft',
    canEditDishes: status === 'draft',
    canPublish: status === 'draft',
    canConfirm: status === 'published',
    canAddChefNote: status === 'published',
    canRate: status === 'confirmed' || status === 'feedback_open',
    canSubmitFeedback: status === 'feedback_open',
    isReadOnly: status !== null && status !== 'draft',
  }
}
