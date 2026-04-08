import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const allowed: Record<string, any> = {}
  if (typeof body.name === 'string') allowed.name = body.name
  if (typeof body.recipe_url === 'string') allowed.recipe_url = body.recipe_url
  const sb = createServerClient()
  const { data, error } = await sb.from('dishes').update(allowed).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dish: data })
}
