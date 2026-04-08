import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getWeekStart } from '@/lib/weekUtils'

export async function GET(request: NextRequest) {
  const sb = createServerClient()
  const week_start = request.nextUrl.searchParams.get('week_start') || getWeekStart()

  const { data: menu } = await sb.from('weekly_menus').select('*').eq('week_start', week_start).maybeSingle()
  if (!menu) return NextResponse.json({ menu: null, items: [], feedback: [] })

  const { data: items } = await sb
    .from('menu_items')
    .select('*, dish:dishes(*)')
    .eq('menu_id', menu.id)
    .order('position', { ascending: true })

  const itemIds = (items ?? []).map((i: any) => i.id)
  let { data: feedback } = await sb.from('daily_feedback').select('*').in('menu_item_id', itemIds)

  // Auto-create missing rows
  const existingByItem = new Map((feedback ?? []).map((f: any) => [f.menu_item_id, f]))
  const toCreate = (items ?? [])
    .filter((i: any) => !existingByItem.has(i.id))
    .map((i: any) => ({ menu_item_id: i.id, dish_id: i.dish_id, rating: null, note: '' }))
  if (toCreate.length > 0) {
    const { data: inserted } = await sb.from('daily_feedback').insert(toCreate).select('*')
    feedback = [...(feedback ?? []), ...(inserted ?? [])]
  }

  return NextResponse.json({ menu, items: items ?? [], feedback: feedback ?? [] })
}

export async function POST(request: NextRequest) {
  const { menu_item_id, rating, note } = await request.json()
  if (!menu_item_id) return NextResponse.json({ error: 'menu_item_id required' }, { status: 400 })
  const sb = createServerClient()

  const { data: existing } = await sb.from('daily_feedback').select('*').eq('menu_item_id', menu_item_id).maybeSingle()

  const update: Record<string, any> = {}
  if (rating !== undefined) {
    update.rating = rating
    update.rated_at = rating ? new Date().toISOString() : null
  }
  if (note !== undefined) update.note = note

  if (existing) {
    const { data, error } = await sb
      .from('daily_feedback')
      .update(update)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ feedback: data })
  } else {
    const { data: item } = await sb.from('menu_items').select('dish_id').eq('id', menu_item_id).single()
    const { data, error } = await sb
      .from('daily_feedback')
      .insert({ menu_item_id, dish_id: item!.dish_id, ...update })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ feedback: data })
  }
}
