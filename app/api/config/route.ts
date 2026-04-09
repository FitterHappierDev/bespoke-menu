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
  console.log('[config PUT] body keys:', Object.keys(body))
  console.log('[config PUT] taste_profile length:', typeof body.taste_profile, body.taste_profile?.length ?? 'n/a')
  console.log('[config PUT] taste_profile preview:', JSON.stringify(body.taste_profile).slice(0, 200))

  const sb = createServerClient()
  const { data: existing } = await sb.from('config').select('id').limit(1).maybeSingle()
  console.log('[config PUT] existing row id:', existing?.id)

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

  console.log('[config PUT] allowed keys:', Object.keys(allowed))
  console.log('[config PUT] allowed.taste_profile length:', allowed.taste_profile?.length ?? 'n/a')

  if (existing) {
    const { data, error } = await sb.from('config').update(allowed).eq('id', existing.id).select('*').single()
    console.log('[config PUT] update error:', error)
    console.log('[config PUT] update returned taste_profile length:', data?.taste_profile?.length ?? 'n/a')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  } else {
    const { data, error } = await sb.from('config').insert(allowed).select('*').single()
    console.log('[config PUT] insert error:', error)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  }
}
