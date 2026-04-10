import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TZ = 'America/Los_Angeles'

export function GET() {
  // Get current date parts in Pacific time
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date())

  const year = Number(parts.find((p) => p.type === 'year')!.value)
  const month = Number(parts.find((p) => p.type === 'month')!.value)
  const dayNum = Number(parts.find((p) => p.type === 'day')!.value)
  const weekday = parts.find((p) => p.type === 'weekday')!.value

  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)

  // Find this week's Sunday
  const d = new Date(Date.UTC(year, month - 1, dayNum))
  d.setUTCDate(d.getUTCDate() - dayIndex)

  // After Sunday (Mon–Sat), default to next week
  if (dayIndex >= 1) {
    d.setUTCDate(d.getUTCDate() + 7)
  }

  const week_start = d.toISOString().split('T')[0]
  return NextResponse.json({ week_start })
}
