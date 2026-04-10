import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildMenuEmailHtml } from '@/lib/emailBuilder'

export async function GET(request: NextRequest) {
  const menu_id = request.nextUrl.searchParams.get('menu_id')
  if (!menu_id) return NextResponse.json({ error: 'menu_id required' }, { status: 400 })

  const sb = createServerClient()
  const { data: menu } = await sb.from('weekly_menus').select('week_start').eq('id', menu_id).single()
  if (!menu) return NextResponse.json({ error: 'Menu not found' }, { status: 404 })

  const emailHtml = await buildMenuEmailHtml(menu_id, menu.week_start)
  return NextResponse.json({ emailHtml })
}
