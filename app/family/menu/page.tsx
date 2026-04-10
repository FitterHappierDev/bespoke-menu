'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import { Sparkles, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { WeekNavigator } from '@/components/WeekNavigator'
import { DishCard } from '@/components/DishCard'
import { ChefProposalCard } from '@/components/ChefProposalCard'
import { AiRegenerateDialog } from '@/components/AiRegenerateDialog'
import { DishAiRegenerateDialog } from '@/components/DishAiRegenerateDialog'
import { PublishDialog } from '@/components/PublishDialog'
import { EmailPreviewDialog } from '@/components/EmailPreviewDialog'
import { EditDishDialog } from '@/components/EditDishDialog'
import { offsetWeek } from '@/lib/weekUtils'
import { getUIState } from '@/lib/statusMachine'
import { cn } from '@/lib/utils'
import type { Dish, MenuItem, WeeklyMenu, ChefProposal } from '@/types'

interface MenuData {
  menu: WeeklyMenu | null
  protein_items: (MenuItem & { dish: Dish })[]
  veg_items: (MenuItem & { dish: Dish })[]
  proposals: ChefProposal[]
}

export default function FamilyMenuPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [anchor, setAnchor] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(false)
  const [mobileTab, setMobileTab] = useState<'protein' | 'veg'>('protein')

  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [dishAiDialogOpen, setDishAiDialogOpen] = useState(false)
  const [regeneratingDish, setRegeneratingDish] = useState<(Dish & { menu_item_id: string; position: number }) | null>(null)
  const [isRegeneratingDish, setIsRegeneratingDish] = useState(false)

  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [emailHtml, setEmailHtml] = useState('')
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false)

  const [editDish, setEditDish] = useState<Dish | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const [defaultPrompt, setDefaultPrompt] = useState('')
  const [generationError, setGenerationError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/week')
      const { week_start } = await res.json()
      setAnchor(week_start)
      setWeekStart(week_start)
    })()
  }, [])

  useEffect(() => {
    if (anchor) setWeekStart(offsetWeek(anchor, weekOffset))
  }, [anchor, weekOffset])

  const fetchMenu = useCallback(async () => {
    if (!weekStart) return
    setLoading(true)
    try {
      const res = await fetch(`/api/menu?week_start=${weekStart}`)
      const data = await res.json()
      setMenuData(data)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  if (!weekStart) return <div className="text-sm text-muted-foreground">Loading...</div>

  const ui = getUIState(menuData?.menu?.status ?? null)
  const isPublished = ui.isReadOnly
  const isCurrentOrFuture = weekOffset >= 0
  const canEdit = ui.canEditDishes && isCurrentOrFuture
  const canGenerateNow = ui.canGenerate && isCurrentOrFuture

  async function openAiDialog() {
    setAiDialogOpen(true)
    if (!defaultPrompt) {
      // Lightweight: fetch from a side endpoint? We don't have one — show placeholder.
      setDefaultPrompt(
        'The current system prompt and constraints from your settings will be used to generate this menu.'
      )
    }
  }

  async function handleGenerate(custom: string) {
    setIsGenerating(true)
    setGenerationError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, custom_prompt: custom }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Generation failed' }))
        const msg = error || 'Generation failed'
        toast.error(msg)
        setGenerationError(msg)
        return
      }
      toast.success('Menu generated')
      setAiDialogOpen(false)
      await fetchMenu()
    } catch (e: any) {
      const msg = e?.message || 'Network error'
      toast.error(msg)
      setGenerationError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDishRegenerate(custom: string) {
    if (!regeneratingDish || !menuData?.menu) return
    setIsRegeneratingDish(true)
    try {
      const res = await fetch('/api/generate-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_id: menuData.menu.id,
          position: regeneratingDish.position,
          type: regeneratingDish.type,
          dish_name: regeneratingDish.name,
          custom_prompt: custom,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        toast.error(error || 'Failed')
        return
      }
      toast.success('Dish regenerated')
      setDishAiDialogOpen(false)
      setRegeneratingDish(null)
      await fetchMenu()
    } finally {
      setIsRegeneratingDish(false)
    }
  }

  async function viewChefEmail() {
    if (!menuData?.menu) return
    const res = await fetch(`/api/publish/email?menu_id=${menuData.menu.id}`)
    if (!res.ok) {
      toast.error('Failed to load email')
      return
    }
    const data = await res.json()
    setEmailHtml(data.emailHtml)
    setEmailPreviewOpen(true)
  }

  async function handlePublish() {
    if (!menuData?.menu) return
    setIsPublishing(true)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: menuData.menu.id }),
      })
      if (!res.ok) {
        toast.error('Publish failed')
        return
      }
      const data = await res.json()
      toast.success('Menu published to chef ✓')
      setPublishDialogOpen(false)
      if (data.emailHtml) {
        setEmailHtml(data.emailHtml)
        setEmailPreviewOpen(true)
      }
      await fetchMenu()
    } finally {
      setIsPublishing(false)
    }
  }

  async function saveNote(item: MenuItem & { dish: Dish }, note: string) {
    await fetch(`/api/menu-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family_note: note }),
    })
    setMenuData((prev) => {
      if (!prev) return prev
      const updateList = (list: (MenuItem & { dish: Dish })[]) =>
        list.map((i) => (i.id === item.id ? { ...i, family_note: note } : i))
      return { ...prev, protein_items: updateList(prev.protein_items), veg_items: updateList(prev.veg_items) }
    })
  }

  async function saveDishEdit(name: string, recipe_url: string) {
    if (!editDish) return
    const res = await fetch(`/api/dishes/${editDish.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, recipe_url }),
    })
    if (res.ok) {
      toast.success('Dish updated')
      setEditOpen(false)
      setEditDish(null)
      await fetchMenu()
    }
  }

  async function handleProposal(p: ChefProposal, status: 'accepted' | 'declined') {
    await fetch(`/api/chef-proposals/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchMenu()
  }

  const hasMenu = !!menuData?.menu
  const proteinItems = menuData?.protein_items ?? []
  const vegItems = menuData?.veg_items ?? []
  const proposals = menuData?.proposals ?? []

  if (loading && !menuData) {
    return <div className="text-sm text-muted-foreground">Loading…</div>
  }

  if (!hasMenu) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Ready to plan this week&apos;s menu?</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Generate 5 protein dishes and 5 vegetable sides tailored to your family&apos;s tastes and constraints.
        </p>
        <div className="flex justify-center mb-6">
          <WeekNavigator weekStart={weekStart} offset={weekOffset} onNavigate={setWeekOffset} />
        </div>
        <Button onClick={openAiDialog} disabled={!canGenerateNow}>
          <Sparkles className="w-4 h-4" /> Generate with AI
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Tip: rate dishes in Feedback to personalize future menus.
        </p>

        <AiRegenerateDialog
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          defaultPrompt={defaultPrompt}
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">This Week&apos;s Menu</h1>
          <div className="mt-2">
            <WeekNavigator weekStart={weekStart} offset={weekOffset} onNavigate={setWeekOffset} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAiDialog} disabled={!canEdit}>
            <Sparkles className="w-4 h-4" /> Regenerate with AI
          </Button>
          {isPublished && (
            <Button variant="outline" onClick={viewChefEmail}>
              <Mail className="w-4 h-4" /> View Chef Email
            </Button>
          )}
          <Button onClick={() => setPublishDialogOpen(true)} disabled={!ui.canPublish || !isCurrentOrFuture}>
            {isPublished ? 'Published' : 'Publish to Chef'}
          </Button>
        </div>
      </div>

      {generationError && (
        <Alert variant="destructive" className="mb-4 flex items-center justify-between gap-3">
          <span>Generation failed: {generationError}</span>
          <Button size="sm" variant="outline" onClick={() => handleGenerate('')} disabled={isGenerating}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Mobile tabs */}
      <div className="md:hidden mb-4">
        <div className="flex border-b border-border">
          {(['protein', 'veg'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMobileTab(t)}
              className={cn(
                'flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 border-b-2 -mb-px transition',
                mobileTab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              )}
            >
              {t === 'protein' ? 'Proteins' : 'Vegetables'}
              <Badge variant="outline">{(t === 'protein' ? proteinItems : vegItems).length}</Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-3">
        {(mobileTab === 'protein' ? proteinItems : vegItems).map((item) => (
          <DishCard
            key={item.id}
            dish={item.dish}
            note={item.family_note}
            isPublished={isPublished}
            onNoteChange={(n) => saveNote(item, n)}
            onRegenerate={() => {
              setRegeneratingDish({ ...item.dish, menu_item_id: item.id, position: item.position })
              setDishAiDialogOpen(true)
            }}
            onEdit={() => {
              setEditDish(item.dish)
              setEditOpen(true)
            }}
          />
        ))}
      </div>

      {/* Desktop two-column */}
      <div className="hidden md:grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
            Proteins <Badge variant="outline">{proteinItems.length}</Badge>
          </h2>
        </div>
        <div>
          <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
            Vegetables <Badge variant="outline">{vegItems.length}</Badge>
          </h2>
        </div>
        {Array.from({ length: Math.max(proteinItems.length, vegItems.length) }).map((_, i) => (
          <Fragment key={i}>
            <div key={`p-${i}`}>
              {proteinItems[i] && (
                <DishCard
                  dish={proteinItems[i].dish}
                  note={proteinItems[i].family_note}
                  isPublished={isPublished}
                  onNoteChange={(n) => saveNote(proteinItems[i], n)}
                  onRegenerate={() => {
                    setRegeneratingDish({
                      ...proteinItems[i].dish,
                      menu_item_id: proteinItems[i].id,
                      position: proteinItems[i].position,
                    })
                    setDishAiDialogOpen(true)
                  }}
                  onEdit={() => {
                    setEditDish(proteinItems[i].dish)
                    setEditOpen(true)
                  }}
                />
              )}
            </div>
            <div key={`v-${i}`}>
              {vegItems[i] && (
                <DishCard
                  dish={vegItems[i].dish}
                  note={vegItems[i].family_note}
                  isPublished={isPublished}
                  onNoteChange={(n) => saveNote(vegItems[i], n)}
                  onRegenerate={() => {
                    setRegeneratingDish({
                      ...vegItems[i].dish,
                      menu_item_id: vegItems[i].id,
                      position: vegItems[i].position,
                    })
                    setDishAiDialogOpen(true)
                  }}
                  onEdit={() => {
                    setEditDish(vegItems[i].dish)
                    setEditOpen(true)
                  }}
                />
              )}
            </div>
          </Fragment>
        ))}
      </div>

      {proposals.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-serif text-xl">Chef&apos;s Proposals</h2>
            <Badge variant="outline">{proposals.filter((p) => p.status === 'proposed').length} pending</Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {proposals.map((p) => (
              <ChefProposalCard
                key={p.id}
                proposal={p}
                onAccept={() => handleProposal(p, 'accepted')}
                onDecline={() => handleProposal(p, 'declined')}
              />
            ))}
          </div>
        </section>
      )}

      <AiRegenerateDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        defaultPrompt={defaultPrompt}
      />
      <DishAiRegenerateDialog
        open={dishAiDialogOpen}
        onOpenChange={setDishAiDialogOpen}
        onGenerate={handleDishRegenerate}
        isGenerating={isRegeneratingDish}
        dish={regeneratingDish}
      />
      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onConfirm={handlePublish}
        isPublishing={isPublishing}
      />
      <EditDishDialog open={editOpen} onOpenChange={setEditOpen} dish={editDish} onSave={saveDishEdit} />
      <EmailPreviewDialog open={emailPreviewOpen} onOpenChange={setEmailPreviewOpen} emailHtml={emailHtml} />
    </div>
  )
}
