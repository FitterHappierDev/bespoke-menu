import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getWeekStart } from '@/lib/weekUtils'

export async function GET(request: NextRequest) {
  const sb = createServerClient()
  const week_start = request.nextUrl.searchParams.get('week_start') || getWeekStart()
  const { data, error } = await sb
    .from('chef_proposals')
    .select('*')
    .eq('week_start', week_start)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proposals: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { dishes, week_start } = await request.json()
  if (!Array.isArray(dishes) || dishes.length === 0)
    return NextResponse.json({ error: 'dishes required' }, { status: 400 })
  const ws = week_start || getWeekStart()
  const sb = createServerClient()

  const { data: configRows } = await sb.from('config').select('chef_max_protein, chef_max_veg').limit(1)
  const cfg = configRows?.[0] ?? { chef_max_protein: 5, chef_max_veg: 5 }

  const proteinCount = dishes.filter((d: any) => d.type === 'protein').length
  const vegCount = dishes.filter((d: any) => d.type === 'veg').length
  if (proteinCount > cfg.chef_max_protein)
    return NextResponse.json(
      { error: `Too many protein proposals (max ${cfg.chef_max_protein})` },
      { status: 400 }
    )
  if (vegCount > cfg.chef_max_veg)
    return NextResponse.json({ error: `Too many veg proposals (max ${cfg.chef_max_veg})` }, { status: 400 })

  const rows = dishes.map((d: any) => ({
    week_start: ws,
    dish_name: String(d.dish_name ?? d.name ?? '').trim(),
    type: d.type,
    ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
    recipe_url: d.recipe_url ?? '',
    chef_notes: d.chef_notes ?? '',
    prep_time_min: d.prep_time_min ?? null,
    emoji: d.emoji ?? '🍽️',
    status: 'proposed',
  }))

  const { data, error } = await sb.from('chef_proposals').insert(rows).select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proposals: data })
}
