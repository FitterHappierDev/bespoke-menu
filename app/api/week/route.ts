import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const now = new Date()
  const day = now.getUTCDay()
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - day)
  const week_start = d.toISOString().split('T')[0]
  return NextResponse.json({ week_start })
}
