'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { Config } from '@/types'

const TASTE_TEMPLATE = `# Family Taste Profile

## Loved flavors
- (e.g. lemon, garlic, herbs)

## Avoid
- (e.g. cilantro, very spicy)

## Cuisines we enjoy
- Mediterranean
- Japanese

## Notes
- Anything else the AI should know.
`

const DEFAULT_RULES = {
  low_sodium: true,
  low_carb: true,
  no_added_sugar: true,
  lean_portion_reduction: true,
  introduce_new_dishes: true,
}

export default function SettingsPage() {
  const [cfg, setCfg] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/config', { cache: 'no-store' })
      const json = await res.json()
      const c = json.config as Config | null
      if (c) {
        setCfg({
          ...c,
          dietary_rules: { ...DEFAULT_RULES, ...(c.dietary_rules ?? {}) },
        })
      }
      setLoading(false)
    })()
  }, [])

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setCfg((c) => (c ? { ...c, [key]: value } : c))
  }

  function updateRule(key: keyof Config['dietary_rules'], value: boolean) {
    setCfg((c) =>
      c ? { ...c, dietary_rules: { ...c.dietary_rules, [key]: value } } : c
    )
  }

  function downloadTemplate() {
    const blob = new Blob([TASTE_TEMPLATE], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'taste-profile.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  function uploadTemplate(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      update('taste_profile', String(reader.result ?? ''))
    }
    reader.readAsText(file)
  }

  async function save() {
    if (!cfg) return
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: cfg.system_prompt,
          allergy_constraints: cfg.allergy_constraints,
          dietary_rules: cfg.dietary_rules,
          taste_profile: cfg.taste_profile,
          chef_max_protein: cfg.chef_max_protein,
          chef_max_veg: cfg.chef_max_veg,
          family_email: cfg.family_email,
          chef_email: cfg.chef_email,
          notification_prefs: cfg.notification_prefs,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Save failed' }))
        toast.error(error || 'Save failed')
        return
      }
      toast.success('Configuration saved ✓')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>
  if (!cfg) return <div className="text-sm text-muted-foreground">No config row found.</div>

  const rules: { key: keyof Config['dietary_rules']; label: string; description: string }[] = [
    { key: 'low_sodium', label: 'Low Sodium', description: 'Use citrus, vinegars, and aromatics for flavor.' },
    { key: 'low_carb', label: 'Low Carb', description: 'Avoid refined sugars and flour-based thickeners.' },
    { key: 'no_added_sugar', label: 'No Added Sugar', description: 'Zero refined sugar in any dish.' },
    {
      key: 'lean_portion_reduction',
      label: 'Lean Portion Reduction',
      description: 'Smaller protein portions (~20% less than standard).',
    },
    {
      key: 'introduce_new_dishes',
      label: 'Introduce New Dishes',
      description: 'Encourage 1-2 brand new dishes per week.',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-8 space-y-6">
      <h1 className="font-serif text-3xl md:text-4xl">Settings</h1>

      {/* System Prompt */}
      <Card className="p-5">
        <h2 className="font-serif text-xl mb-1">System Prompt</h2>
        <p className="text-xs text-muted-foreground mb-3">
          The base instructions sent to the AI for every menu generation.
        </p>
        <Textarea
          rows={15}
          className="font-mono text-xs"
          value={cfg.system_prompt}
          onChange={(e) => update('system_prompt', e.target.value)}
        />
      </Card>

      {/* Allergy Constraints */}
      <Card className="p-5">
        <h2 className="font-serif text-xl mb-1">Allergy Constraints</h2>
        <p className="text-xs text-muted-foreground mb-3">One per line. The AI will be told to never include these.</p>
        <Textarea
          rows={4}
          placeholder={'No shellfish\nNo tree nuts'}
          value={cfg.allergy_constraints}
          onChange={(e) => update('allergy_constraints', e.target.value)}
        />
      </Card>

      {/* Dietary Rules */}
      <Card className="p-5">
        <h2 className="font-serif text-xl mb-3">Dietary Rules</h2>
        <div className="space-y-3">
          {rules.map((r, i) => (
            <div key={r.key}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor={`rule-${r.key}`} className="text-sm">
                    {r.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                </div>
                <Switch
                  id={`rule-${r.key}`}
                  checked={!!cfg.dietary_rules[r.key]}
                  onCheckedChange={(v) => updateRule(r.key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Taste Profile */}
      <Card className="p-5">
        <h2 className="font-serif text-xl mb-1">Taste Profile</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Free-form notes about flavors, cuisines, and preferences. Download a template to start, or upload your own.
        </p>
        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            Download Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Upload Profile
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadTemplate(f)
            }}
          />
        </div>
        <Textarea
          rows={10}
          className="font-mono text-xs"
          value={cfg.taste_profile}
          onChange={(e) => update('taste_profile', e.target.value)}
        />
      </Card>

      {/* Chef Proposal Limits */}
      <Card className="p-5">
        <h2 className="font-serif text-xl mb-1">Chef Proposal Limits</h2>
        <p className="text-xs text-muted-foreground mb-3">Maximum proposals the chef can submit per week (1-5).</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="max-protein">Max protein</Label>
            <Input
              id="max-protein"
              type="number"
              min={1}
              max={5}
              className="mt-1"
              value={cfg.chef_max_protein}
              onChange={(e) => update('chef_max_protein', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="max-veg">Max vegetable</Label>
            <Input
              id="max-veg"
              type="number"
              min={1}
              max={5}
              className="mt-1"
              value={cfg.chef_max_veg}
              onChange={(e) => update('chef_max_veg', Number(e.target.value))}
            />
          </div>
        </div>
      </Card>

      {/* Email Notifications */}
      <Card className="p-5">
        <h2 className="font-serif text-xl mb-1">Email Notifications</h2>
        <p className="text-xs text-muted-foreground mb-3">Where to send notifications (not yet wired to delivery).</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="family-email">Family email</Label>
            <Input
              id="family-email"
              type="email"
              className="mt-1"
              value={cfg.family_email}
              onChange={(e) => update('family_email', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="chef-email">Chef email</Label>
            <Input
              id="chef-email"
              type="email"
              className="mt-1"
              value={cfg.chef_email}
              onChange={(e) => update('chef_email', e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Configuration'}
      </Button>
    </div>
  )
}
