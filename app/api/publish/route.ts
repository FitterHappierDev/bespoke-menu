import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { canTransition } from '@/lib/statusMachine'
import { buildMenuEmailHtml } from '@/lib/emailBuilder'

export async function POST(request: NextRequest) {
  const { menu_id } = await request.json()
  if (!menu_id) return NextResponse.json({ error: 'menu_id required' }, { status: 400 })
  const sb = createServerClient()
  const { data: menu } = await sb.from('weekly_menus').select('*').eq('id', menu_id).single()
  if (!menu) return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
  if (!canTransition(menu.status, 'published'))
    return NextResponse.json({ error: `Cannot publish from ${menu.status}` }, { status: 409 })
  const { data: updated } = await sb
    .from('weekly_menus')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', menu_id)
    .select('*')
    .single()

  const emailHtml = await buildMenuEmailHtml(menu_id, menu.week_start)
  return NextResponse.json({ menu: updated, emailHtml })
}
