import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const sb = createServerClient()
  const { data, error } = await sb.from('config').select('*').limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const sb = createServerClient()
  const { data: existing } = await sb.from('config').select('id').limit(1).maybeSingle()
  const allowed: Record<string, any> = {}
  for (const k of [
    'system_prompt',
    'allergy_constraints',
    'dietary_rules',
    'taste_profile',
    'chef_max_protein',
    'chef_max_veg',
    'family_email',
    'chef_email',
    'notification_prefs',
  ]) {
    if (body[k] !== undefined) allowed[k] = body[k]
  }
  if (typeof allowed.chef_max_protein === 'number')
    allowed.chef_max_protein = Math.max(1, Math.min(5, allowed.chef_max_protein))
  if (typeof allowed.chef_max_veg === 'number')
    allowed.chef_max_veg = Math.max(1, Math.min(5, allowed.chef_max_veg))
  allowed.updated_at = new Date().toISOString()

  if (existing) {
    const { data, error } = await sb.from('config').update(allowed).eq('id', existing.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  } else {
    const { data, error } = await sb.from('config').insert(allowed).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  }
}
