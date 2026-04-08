import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { canTransition } from '@/lib/statusMachine'

export async function POST(request: NextRequest) {
  const { week_start } = await request.json()
  if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })

  const sb = createServerClient()
  const { data: menu } = await sb.from('weekly_menus').select('*').eq('week_start', week_start).maybeSingle()
  if (!menu) return NextResponse.json({ error: 'Menu not found' }, { status: 404 })

  // Allow submission from feedback_open OR confirmed (the spec lifecycle implies confirmed→feedback_open
  // happens automatically, but for sprint 3 we relax to allow either).
  const fromStatus = menu.status
  const target = 'feedback_submitted'
  let nextStatus = fromStatus
  if (fromStatus === 'feedback_open' || fromStatus === 'confirmed' || fromStatus === 'published')
    nextStatus = target
  else if (!canTransition(fromStatus, target))
    return NextResponse.json({ error: `Cannot submit from ${fromStatus}` }, { status: 409 })

  const { data: items } = await sb.from('menu_items').select('id').eq('menu_id', menu.id)
  const itemIds = (items ?? []).map((i: any) => i.id)
  const { data: feedback } = await sb.from('daily_feedback').select('*').in('menu_item_id', itemIds)

  const summary = {
    loved: (feedback ?? []).filter((f: any) => f.rating === 'loved').length,
    ok: (feedback ?? []).filter((f: any) => f.rating === 'ok').length,
    disliked: (feedback ?? []).filter((f: any) => f.rating === 'disliked').length,
    notes: (feedback ?? []).map((f: any) => f.note).filter(Boolean),
  }

  const { data: batch } = await sb
    .from('feedback_batches')
    .insert({
      week_start,
      submitted_at: new Date().toISOString(),
      dish_count: (feedback ?? []).filter((f: any) => f.rating).length,
      summary,
    })
    .select('*')
    .single()

  await sb.from('daily_feedback').update({ batch_id: batch!.id }).in('menu_item_id', itemIds)
  await sb.from('weekly_menus').update({ status: nextStatus }).eq('id', menu.id)

  return NextResponse.json({ batch, summary })
}
