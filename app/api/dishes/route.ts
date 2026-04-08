import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET /api/dishes?type=protein|veg&rating=loved|ok|disliked&q=search
export async function GET(request: NextRequest) {
  const sb = createServerClient()
  const sp = request.nextUrl.searchParams
  const type = sp.get('type')
  const rating = sp.get('rating')
  const q = sp.get('q')?.trim() ?? ''

  let query = sb.from('dishes').select('*').order('created_at', { ascending: false })
  if (type === 'protein' || type === 'veg') query = query.eq('type', type)
  if (q) query = query.ilike('name', `%${q}%`)
  const { data: dishes, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (dishes ?? []).map((d) => d.id)
  let ratingByDish = new Map<string, { rating: string | null; note: string; rated_at: string | null }>()
  let countsByDish = new Map<string, number>()
  if (ids.length > 0) {
    const { data: feedback } = await sb
      .from('daily_feedback')
      .select('dish_id, rating, note, rated_at')
      .in('dish_id', ids)
      .order('rated_at', { ascending: false })
    for (const row of feedback ?? []) {
      const id = (row as any).dish_id
      countsByDish.set(id, (countsByDish.get(id) ?? 0) + ((row as any).rating ? 1 : 0))
      if (!ratingByDish.has(id) && (row as any).rating) {
        ratingByDish.set(id, {
          rating: (row as any).rating,
          note: (row as any).note ?? '',
          rated_at: (row as any).rated_at,
        })
      }
    }
  }

  let enriched = (dishes ?? []).map((d) => {
    const r = ratingByDish.get(d.id)
    return {
      ...d,
      lastRating: r?.rating ?? null,
      lastNote: r?.note ?? '',
      lastServed: r?.rated_at ?? null,
      timesServed: countsByDish.get(d.id) ?? 0,
    }
  })

  if (rating === 'loved' || rating === 'ok' || rating === 'disliked') {
    enriched = enriched.filter((d) => d.lastRating === rating)
  }

  return NextResponse.json({ dishes: enriched })
}

// POST /api/dishes  body: { dishes: [{ name, type, ingredients, recipe_url?, description?, rating?, note?, served_date? }] }
export async function POST(request: NextRequest) {
  const { dishes } = await request.json()
  if (!Array.isArray(dishes)) return NextResponse.json({ error: 'dishes array required' }, { status: 400 })
  const sb = createServerClient()

  const results: any[] = []
  for (const d of dishes) {
    const name = String(d.name ?? '').trim()
    if (!name) continue
    const type = d.type === 'veg' ? 'veg' : 'protein'
    const payload = {
      name,
      type,
      emoji: d.emoji ?? '🍽️',
      recipe_url: d.recipe_url ?? '',
      ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
      description: d.description ?? '',
      is_new: false,
    }
    const { data: existing } = await sb.from('dishes').select('id').ilike('name', name).maybeSingle()
    let dish_id: string
    if (existing) {
      await sb.from('dishes').update(payload).eq('id', existing.id)
      dish_id = existing.id
    } else {
      const { data: inserted, error } = await sb.from('dishes').insert(payload).select('id').single()
      if (error) continue
      dish_id = inserted!.id
    }
    if (d.rating && ['loved', 'ok', 'disliked'].includes(d.rating)) {
      await sb.from('dish_ratings').insert({ dish_id, rating: d.rating, note: d.note ?? '' })
    }
    results.push({ id: dish_id, name })
  }
  return NextResponse.json({ imported: results.length, dishes: results })
}
