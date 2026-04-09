import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = createServerClient()
  const { data, error } = await sb.from('config').select('*').limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const debug: any = {
    body_keys: Object.keys(body),
    body_taste_profile_type: typeof body.taste_profile,
    body_taste_profile_length: typeof body.taste_profile === 'string' ? body.taste_profile.length : null,
    body_taste_profile_preview:
      typeof body.taste_profile === 'string' ? body.taste_profile.slice(0, 80) : String(body.taste_profile),
  }

  const sb = createServerClient()
  const { data: existing } = await sb.from('config').select('id').limit(1).maybeSingle()
  debug.existing_row_id = existing?.id ?? null

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

  debug.allowed_keys = Object.keys(allowed)
  debug.allowed_taste_profile_length =
    typeof allowed.taste_profile === 'string' ? allowed.taste_profile.length : null

  if (existing) {
    const { data, error } = await sb.from('config').update(allowed).eq('id', existing.id).select('*').single()
    debug.update_error = error?.message ?? null
    debug.returned_taste_profile_length =
      typeof data?.taste_profile === 'string' ? data.taste_profile.length : null
    console.log('[config PUT]', JSON.stringify(debug))
    if (error) return NextResponse.json({ error: error.message, debug }, { status: 500 })
    return NextResponse.json({ config: data, debug })
  } else {
    const { data, error } = await sb.from('config').insert(allowed).select('*').single()
    debug.insert_error = error?.message ?? null
    console.log('[config PUT]', JSON.stringify(debug))
    if (error) return NextResponse.json({ error: error.message, debug }, { status: 500 })
    return NextResponse.json({ config: data, debug })
  }
}
