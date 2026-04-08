import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// PATCH /api/menus/:id/chef-notes
// Body: { dish_id: string, note: string }
// Merges into weekly_menus.chef_notes JSON.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { dish_id, note } = await request.json()
  if (!dish_id) return NextResponse.json({ error: 'dish_id required' }, { status: 400 })
  const sb = createServerClient()
  const { data: menu, error: fetchErr } = await sb
    .from('weekly_menus')
    .select('chef_notes, status')
    .eq('id', params.id)
    .single()
  if (fetchErr || !menu) return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
  if (menu.status !== 'published')
    return NextResponse.json({ error: `Cannot edit notes from ${menu.status}` }, { status: 409 })
  const next = { ...((menu.chef_notes as Record<string, string>) ?? {}), [dish_id]: note }
  const { data, error } = await sb
    .from('weekly_menus')
    .update({ chef_notes: next })
    .eq('id', params.id)
    .select('chef_notes')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ chef_notes: data.chef_notes })
}
