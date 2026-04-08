import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { status } = await request.json()
  if (!['accepted', 'declined'].includes(status))
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  const sb = createServerClient()
  const { data, error } = await sb
    .from('chef_proposals')
    .update({ status })
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proposal: data })
}
