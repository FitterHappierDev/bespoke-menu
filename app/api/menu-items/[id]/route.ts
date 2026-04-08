import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const allowed: Record<string, any> = {}
  if (typeof body.family_note === 'string') allowed.family_note = body.family_note
  const sb = createServerClient()
  const { data, error } = await sb.from('menu_items').update(allowed).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
