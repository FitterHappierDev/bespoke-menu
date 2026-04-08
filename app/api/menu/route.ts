import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getWeekStart } from '@/lib/weekUtils'

export async function GET(request: NextRequest) {
  const sb = createServerClient()
  const week_start = request.nextUrl.searchParams.get('week_start') || getWeekStart()

  const { data: menu } = await sb.from('weekly_menus').select('*').eq('week_start', week_start).maybeSingle()

  let protein_items: any[] = []
  let veg_items: any[] = []
  if (menu) {
    const { data: items } = await sb
      .from('menu_items')
      .select('*, dish:dishes(*)')
      .eq('menu_id', menu.id)
      .order('position', { ascending: true })
    protein_items = (items ?? []).filter((i) => i.type === 'protein')
    veg_items = (items ?? []).filter((i) => i.type === 'veg')
  }

  const { data: proposals } = await sb
    .from('chef_proposals')
    .select('*')
    .eq('week_start', week_start)
    .order('created_at', { ascending: false })

  const { data: ctxRows } = await sb
    .from('daily_feedback')
    .select('rating, note, dish:dishes(name)')
    .not('rating', 'is', null)
    .order('rated_at', { ascending: false })
    .limit(5)

  const feedback_context = (ctxRows ?? []).map((r: any) => ({
    rating: r.rating,
    label: `${r.dish?.name ?? ''}${r.note ? ` — ${r.note}` : ''}`,
  }))

  // Optional: per-dish history (last rating + lastServed) for chef view
  let dish_history: Record<string, { rating: string | null; note: string; rated_at: string | null }> = {}
  if (request.nextUrl.searchParams.get('include') === 'history' && menu) {
    const dishIds = [...protein_items, ...veg_items].map((i: any) => i.dish_id)
    if (dishIds.length > 0) {
      const { data: prior } = await sb
        .from('daily_feedback')
        .select('dish_id, rating, note, rated_at, menu_item_id')
        .in('dish_id', dishIds)
        .not('rating', 'is', null)
        .order('rated_at', { ascending: false })
      const seen = new Set<string>()
      for (const row of prior ?? []) {
        // Skip rows belonging to the current week's menu_items to surface true history
        const isCurrent = [...protein_items, ...veg_items].some((i: any) => i.id === (row as any).menu_item_id)
        if (isCurrent) continue
        if (seen.has((row as any).dish_id)) continue
        seen.add((row as any).dish_id)
        dish_history[(row as any).dish_id] = {
          rating: (row as any).rating,
          note: (row as any).note ?? '',
          rated_at: (row as any).rated_at,
        }
      }
    }
  }

  return NextResponse.json({
    menu: menu ?? null,
    protein_items,
    veg_items,
    proposals: proposals ?? [],
    feedback_context,
    dish_history,
  })
}
