export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function offsetWeek(weekStart: string, offset: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + offset * 7)
  return d.toISOString().split('T')[0]
}

export function canNavigateForward(currentOffset: number): boolean {
  return currentOffset < 1
}

export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  return `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
}
