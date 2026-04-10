import { createServerClient } from './supabase-server'
import { formatWeekLabel } from './weekUtils'

export async function buildMenuEmailHtml(menuId: string, weekStart: string): Promise<string> {
  const sb = createServerClient()
  const { data: items } = await sb
    .from('menu_items')
    .select('type, position, dish:dishes(name, emoji, description, ingredients)')
    .eq('menu_id', menuId)
    .order('position')

  const proteins = (items ?? []).filter((i: any) => i.type === 'protein')
  const vegs = (items ?? []).filter((i: any) => i.type === 'veg')
  const weekLabel = formatWeekLabel(weekStart)

  function dishRow(item: any) {
    const d = item.dish
    if (!d) return ''
    const ingredients = (d.ingredients ?? []).join(', ')
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e8e0d8;">
          <div style="font-size:16px;font-weight:600;margin-bottom:4px;">${d.emoji || '🍽️'} ${d.name}</div>
          ${d.description ? `<div style="font-size:13px;color:#6b5c4c;font-style:italic;margin-bottom:4px;">${d.description}</div>` : ''}
          ${ingredients ? `<div style="font-size:12px;color:#8b7355;">Ingredients: ${ingredients}</div>` : ''}
        </td>
      </tr>`
  }

  return `
<div style="max-width:600px;margin:0 auto;font-family:Georgia,serif;color:#2d2017;">
  <div style="background:#faf5f0;padding:24px;border-radius:12px;">
    <h1 style="font-size:24px;margin:0 0 4px;">${weekLabel}</h1>
    <p style="font-size:14px;color:#8b7355;margin:0 0 20px;">Your weekly menu is ready!</p>

    <h2 style="font-size:18px;margin:0 0 8px;">Proteins</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;margin-bottom:20px;">
      ${proteins.map(dishRow).join('')}
    </table>

    <h2 style="font-size:18px;margin:0 0 8px;">Vegetables</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;">
      ${vegs.map(dishRow).join('')}
    </table>
  </div>
</div>`.trim()
}
