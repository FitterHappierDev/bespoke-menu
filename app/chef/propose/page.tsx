'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { formatWeekLabel } from '@/lib/weekUtils'
import type { ChefProposal, DishType } from '@/types'
import { cn } from '@/lib/utils'

interface ParsedRow {
  dish_name: string
  type: DishType
  ingredients: string[]
  recipe_url: string
  chef_notes: string
  prep_time_min: number | null
  emoji: string
  errors: string[]
}

const REQUIRED = ['dish_name', 'type', 'ingredients']

function normalizeKey(k: string): string {
  return k.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function parseRow(raw: any): ParsedRow {
  const r: Record<string, any> = {}
  for (const k of Object.keys(raw)) r[normalizeKey(k)] = raw[k]
  const dish_name = String(r.dish_name ?? r.name ?? '').trim()
  const typeRaw = String(r.type ?? '').trim().toLowerCase()
  const type: DishType = typeRaw.startsWith('v') ? 'veg' : 'protein'
  const ingredientsRaw = String(r.ingredients ?? '').trim()
  const ingredients = ingredientsRaw
    ? ingredientsRaw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
    : []
  const errors: string[] = []
  if (!dish_name) errors.push('Missing name')
  if (!typeRaw || !['protein', 'veg', 'vegetable'].includes(typeRaw))
    errors.push('Type must be "protein" or "veg"')
  if (ingredients.length === 0) errors.push('Missing ingredients')
  return {
    dish_name,
    type,
    ingredients,
    recipe_url: String(r.recipe_url ?? r.url ?? '').trim(),
    chef_notes: String(r.chef_notes ?? r.notes ?? '').trim(),
    prep_time_min: r.prep_time_min ? Number(r.prep_time_min) : null,
    emoji: String(r.emoji ?? '🍽️').trim() || '🍽️',
    errors,
  }
}

export default function ProposePage() {
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [existing, setExisting] = useState<ChefProposal[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/week')
      const { week_start } = await res.json()
      setWeekStart(week_start)
    })()
  }, [])

  const fetchExisting = useCallback(async () => {
    if (!weekStart) return
    const res = await fetch(`/api/chef-proposals?week_start=${weekStart}`)
    if (res.ok) {
      const json = await res.json()
      setExisting(json.proposals ?? [])
    }
  }, [weekStart])

  useEffect(() => {
    fetchExisting()
  }, [fetchExisting])

  async function handleFile(file: File) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' })
    const out = rows.map(parseRow).filter((r) => r.dish_name || r.ingredients.length)
    if (out.length === 0) {
      toast.error('No rows found in spreadsheet')
      return
    }
    setParsed(out)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function submit() {
    const valid = parsed.filter((p) => p.errors.length === 0)
    if (valid.length === 0) {
      toast.error('No valid rows to submit')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/chef-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, dishes: valid }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Submit failed' }))
        toast.error(error || 'Submit failed')
        return
      }
      toast.success(`Submitted ${valid.length} proposal${valid.length === 1 ? '' : 's'}`)
      setParsed([])
      if (fileRef.current) fileRef.current.value = ''
      await fetchExisting()
    } finally {
      setSubmitting(false)
    }
  }

  if (!weekStart) return <div className="text-sm text-muted-foreground">Loading...</div>

  const validCount = parsed.filter((p) => p.errors.length === 0).length
  const errorCount = parsed.length - validCount

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl md:text-4xl mb-1">Propose Dishes</h1>
      <p className="text-sm text-muted-foreground mb-6">{formatWeekLabel(weekStart)}</p>

      <Card className="p-5 mb-4">
        <h2 className="font-serif text-lg mb-2">Template Format</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Upload an Excel (.xlsx) file. The first sheet should have these columns:
        </p>
        <ul className="text-xs space-y-1">
          <li>
            <Badge variant="outline">required</Badge> <code>dish_name</code> — name of the dish
          </li>
          <li>
            <Badge variant="outline">required</Badge> <code>type</code> — &ldquo;protein&rdquo; or &ldquo;veg&rdquo;
          </li>
          <li>
            <Badge variant="outline">required</Badge> <code>ingredients</code> — comma-separated
          </li>
          <li>
            <Badge variant="secondary">optional</Badge> <code>recipe_url</code>, <code>chef_notes</code>,{' '}
            <code>prep_time_min</code>, <code>emoji</code>
          </li>
        </ul>
      </Card>

      <Card
        className={cn(
          'p-8 mb-4 border-dashed border-2 text-center cursor-pointer transition',
          dragOver ? 'border-primary bg-primary/5' : 'border-border'
        )}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <div className="text-sm">Click or drag an .xlsx file here</div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </Card>

      {parsed.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">Preview</h2>
            <div className="flex gap-2 text-xs">
              <Badge variant="success">{validCount} valid</Badge>
              {errorCount > 0 && <Badge variant="destructive">{errorCount} with errors</Badge>}
            </div>
          </div>
          <div className="space-y-2 mb-3">
            {parsed.map((p, i) => (
              <Card key={i} className={cn('p-3', p.errors.length && 'border-destructive/50')}>
                <div className="flex gap-2 items-start">
                  <div className="text-2xl leading-none">{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">{p.dish_name || '(no name)'}</div>
                      <Badge variant="outline">{p.type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.ingredients.join(', ')}</div>
                    {p.chef_notes && <div className="text-xs italic mt-1">&ldquo;{p.chef_notes}&rdquo;</div>}
                    {p.errors.length > 0 && (
                      <Alert variant="destructive" className="mt-2 py-1 text-xs">
                        {p.errors.join(', ')}
                      </Alert>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setParsed((rows) => rows.filter((_, idx) => idx !== i))}
                    className="p-1 rounded hover:bg-secondary"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
          <Button onClick={submit} disabled={submitting || validCount === 0}>
            Submit {validCount} Proposal{validCount === 1 ? '' : 's'}
          </Button>
        </div>
      )}

      {existing.length > 0 && (
        <section>
          <h2 className="font-serif text-xl mb-3">Previously Submitted</h2>
          <div className="space-y-2">
            {existing.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-center gap-2">
                  <div className="text-2xl leading-none">{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{p.dish_name}</div>
                    <div className="text-xs text-muted-foreground">{p.ingredients.join(', ')}</div>
                  </div>
                  {p.status === 'proposed' && <Badge variant="outline">Pending</Badge>}
                  {p.status === 'accepted' && <Badge variant="success">Accepted</Badge>}
                  {p.status === 'declined' && <Badge variant="destructive">Declined</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
