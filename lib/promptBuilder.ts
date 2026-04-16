import { createServerClient } from './supabase-server'
import type { Config } from '@/types'

export interface PromptContext {
  config: Config
  recentBatchFeedback: { dish_name: string; rating: string; note: string }[]
  topLoved: { dish_name: string; note: string }[]
  disliked: { dish_name: string; note: string }[]
  legacyRatings: { dish_name: string; rating: string; note: string }[]
  recentlyServed: string[]
}

const RECENTLY_SERVED_WEEKS = 3

export async function buildPromptContext(weekStart?: string): Promise<PromptContext> {
  const sb = createServerClient()
  const { data: configRows } = await sb.from('config').select('*').limit(1)
  const config = configRows?.[0] as Config

  // Fetch dishes served in the last N weeks (excluding the week we're generating for)
  let recentMenuQuery = sb
    .from('weekly_menus')
    .select('id, week_start')
    .order('week_start', { ascending: false })
    .limit(RECENTLY_SERVED_WEEKS)
  if (weekStart) recentMenuQuery = recentMenuQuery.lt('week_start', weekStart)
  const { data: recentMenus } = await recentMenuQuery
  const recentMenuIds = (recentMenus ?? []).map((m: any) => m.id)
  let recentlyServed: string[] = []
  if (recentMenuIds.length) {
    const { data: recentItems } = await sb
      .from('menu_items')
      .select('dish:dishes(name)')
      .in('menu_id', recentMenuIds)
    const seen = new Set<string>()
    for (const row of recentItems ?? []) {
      const name = (row as any).dish?.name
      if (name && !seen.has(name)) {
        seen.add(name)
        recentlyServed.push(name)
      }
    }
  }

  const { data: lovedRows } = await sb
    .from('daily_feedback')
    .select('rating, note, rated_at, dish:dishes(name)')
    .eq('rating', 'loved')
    .order('rated_at', { ascending: false })
    .limit(10)

  const { data: dislikedRows } = await sb
    .from('daily_feedback')
    .select('rating, note, dish:dishes(name)')
    .eq('rating', 'disliked')

  const { data: recentBatchRows } = await sb
    .from('daily_feedback')
    .select('rating, note, rated_at, dish:dishes(name)')
    .not('batch_id', 'is', null)
    .order('rated_at', { ascending: false })
    .limit(20)

  const { data: legacyRows } = await sb
    .from('dish_ratings')
    .select('rating, note, dish:dishes(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  const mapName = (rows: any[] | null) =>
    (rows ?? []).map((r) => ({ dish_name: r.dish?.name ?? 'Unknown', rating: r.rating, note: r.note ?? '' }))

  return {
    config,
    recentBatchFeedback: mapName(recentBatchRows),
    topLoved: (lovedRows ?? []).map((r: any) => ({ dish_name: r.dish?.name ?? 'Unknown', note: r.note ?? '' })),
    disliked: (dislikedRows ?? []).map((r: any) => ({ dish_name: r.dish?.name ?? 'Unknown', note: r.note ?? '' })),
    legacyRatings: mapName(legacyRows),
    recentlyServed,
  }
}

const OUTPUT_SCHEMA = `
### OUTPUT FORMAT (REQUIRED)
Return ONLY a JSON object with this exact shape (no prose, no markdown fences):
{
  "protein_dishes": [
    { "name": "...", "emoji": "...", "recipe_url": "https://...", "tags": ["Low Sodium","Low Carb"], "ingredients": ["..."], "description": "1-2 short sentences, max ~25 words", "is_new": false }
  ],
  "veg_dishes": [
    { "name": "...", "emoji": "...", "recipe_url": "https://...", "tags": ["..."], "ingredients": ["..."], "description": "1-2 short sentences, max ~25 words", "is_new": false }
  ]
}
Exactly 5 protein_dishes and exactly 5 veg_dishes.
`.trim()

export function assemblePrompt(ctx: PromptContext, customInstructions?: string): string {
  const { config } = ctx
  const allergyLines = (config.allergy_constraints || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => `- NEVER include ${line.replace(/^no\s+/i, '')}`)
    .join('\n')

  const rules = config.dietary_rules || ({} as any)
  const ruleLines: string[] = []
  if (rules.low_sodium) ruleLines.push('- Low Sodium')
  if (rules.low_carb) ruleLines.push('- Low Carb')
  if (rules.no_added_sugar) ruleLines.push('- No Added Sugar')
  if (rules.lean_portion_reduction) ruleLines.push('- Lean portion reduction (~20%)')
  if (rules.introduce_new_dishes) ruleLines.push('- Introduce 1-2 brand new dishes per week')

  const tasteBlock = config.taste_profile?.trim()
    ? `### FAMILY TASTE PROFILE\n${config.taste_profile.trim()}`
    : ''

  const recentBatchBlock = ctx.recentBatchFeedback.length
    ? `### RECENT FEEDBACK BATCH\n` +
      ctx.recentBatchFeedback.map((r) => `- ${r.dish_name}: ${r.rating}${r.note ? ` — "${r.note}"` : ''}`).join('\n')
    : ''

  const lovedBlock = ctx.topLoved.length
    ? `### FLAVOR INSPIRATION (loved dishes — use as a guide for style/cuisine, but do NOT repeat the exact dishes)\n` +
      ctx.topLoved.map((r) => `- ${r.dish_name}${r.note ? ` — "${r.note}"` : ''}`).join('\n')
    : ''

  const dislikedBlock = ctx.disliked.length
    ? `### EXCLUDED DISHES (disliked, do NOT repeat)\n` +
      ctx.disliked.map((r) => `- ${r.dish_name}${r.note ? ` — "${r.note}"` : ''}`).join('\n')
    : ''

  const recentlyServedBlock = ctx.recentlyServed.length
    ? `### RECENTLY SERVED (do NOT repeat — served in the last ${RECENTLY_SERVED_WEEKS} weeks)\n` +
      ctx.recentlyServed.map((n) => `- ${n}`).join('\n')
    : ''

  const legacyBlock = ctx.legacyRatings.length
    ? `### HISTORICAL PRIMING\n` +
      ctx.legacyRatings.map((r) => `- ${r.dish_name}: ${r.rating}`).join('\n')
    : ''

  const customBlock = customInstructions?.trim()
    ? `### CUSTOM INSTRUCTIONS FOR THIS WEEK\n${customInstructions.trim()}`
    : ''

  return [
    config.system_prompt,
    `### ALLERGY CONSTRAINTS\n${allergyLines || '(none)'}`,
    `### DIETARY RULES\n${ruleLines.join('\n') || '(none)'}`,
    tasteBlock,
    recentBatchBlock,
    lovedBlock,
    dislikedBlock,
    recentlyServedBlock,
    legacyBlock,
    customBlock,
    OUTPUT_SCHEMA,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export async function buildSingleDishContext(): Promise<{
  allergyConstraints: string
  dislikedNames: string[]
}> {
  const sb = createServerClient()
  const { data: configRows } = await sb.from('config').select('allergy_constraints').limit(1)
  const allergyConstraints = (configRows?.[0]?.allergy_constraints as string) || ''

  const { data: dislikedRows } = await sb
    .from('daily_feedback')
    .select('dish:dishes(name)')
    .eq('rating', 'disliked')

  const dislikedNames = (dislikedRows ?? [])
    .map((r: any) => r.dish?.name)
    .filter((n: any): n is string => !!n)

  return { allergyConstraints, dislikedNames }
}

export function getDefaultPromptPreview(ctx: PromptContext): string {
  return assemblePrompt(ctx)
}
