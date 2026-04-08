'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Dish } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  dish: Dish | null
  onSave: (name: string, recipe_url: string) => void
}

export function EditDishDialog({ open, onOpenChange, dish, onSave }: Props) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (dish) {
      setName(dish.name)
      setUrl(dish.recipe_url)
    }
  }, [dish])
  if (!dish) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit dish</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Dish name</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Recipe URL</Label>
          <Input className="mt-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={() => onSave(name, url)}>Save</Button>
      </DialogFooter>
    </Dialog>
  )
}
