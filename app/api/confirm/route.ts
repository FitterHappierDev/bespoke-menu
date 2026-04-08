import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { canTransition } from '@/lib/statusMachine'

export async function POST(request: NextRequest) {
  const { menu_id, chef_notes } = await request.json()
  if (!menu_id) return NextResponse.json({ error: 'menu_id required' }, { status: 400 })
  const sb = createServerClient()
  const { data: menu } = await sb.from('weekly_menus').select('*').eq('id', menu_id).single()
  if (!menu) return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
  if (!canTransition(menu.status, 'confirmed'))
    return NextResponse.json({ error: `Cannot confirm from ${menu.status}` }, { status: 409 })
  const update: Record<string, any> = {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  }
  if (chef_notes) update.chef_notes = chef_notes
  const { data: updated } = await sb.from('weekly_menus').update(update).eq('id', menu_id).select('*').single()
  return NextResponse.json({ menu: updated })
}
