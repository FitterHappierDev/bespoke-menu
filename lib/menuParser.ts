import type { GeneratedDish } from '@/types'

export interface ParsedMenu {
  protein_dishes: GeneratedDish[]
  veg_dishes: GeneratedDish[]
}

const DEFAULT_TAGS = ['Low Sodium', 'Low Carb', 'No Sugar']

function stripFences(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  return text.trim()
}

function extractJson(text: string): string {
  const cleaned = stripFences(text)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response')
  return cleaned.slice(start, end + 1)
}

function normalizeDish(raw: any, idx: number, kind: string): GeneratedDish {
  if (!raw || typeof raw !== 'object') throw new Error(`${kind}[${idx}] is not an object`)
  const name = String(raw.name ?? '').trim()
  if (!name) throw new Error(`${kind}[${idx}] missing name`)
  return {
    name,
    emoji: String(raw.emoji ?? '🍽️'),
    recipe_url: String(raw.recipe_url ?? ''),
    tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags.map(String) : DEFAULT_TAGS,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.map(String) : [],
    description: String(raw.description ?? ''),
    is_new: Boolean(raw.is_new ?? false),
  }
}

export function parseMenuResponse(rawText: string): ParsedMenu {
  const json = extractJson(rawText)
  let parsed: any
  try {
    parsed = JSON.parse(json)
  } catch (e: any) {
    throw new Error(`Invalid JSON from model: ${e.message}`)
  }
  const proteinRaw = parsed.protein_dishes
  const vegRaw = parsed.veg_dishes
  if (!Array.isArray(proteinRaw) || proteinRaw.length !== 5)
    throw new Error(`Expected 5 protein_dishes, got ${proteinRaw?.length ?? 'none'}`)
  if (!Array.isArray(vegRaw) || vegRaw.length !== 5)
    throw new Error(`Expected 5 veg_dishes, got ${vegRaw?.length ?? 'none'}`)
  return {
    protein_dishes: proteinRaw.map((d, i) => normalizeDish(d, i, 'protein')),
    veg_dishes: vegRaw.map((d, i) => normalizeDish(d, i, 'veg')),
  }
}

export function parseSingleDish(rawText: string, type: 'protein' | 'veg'): GeneratedDish {
  const json = extractJson(rawText)
  const parsed = JSON.parse(json)
  const dish = parsed.dish ?? parsed.protein_dishes?.[0] ?? parsed.veg_dishes?.[0] ?? parsed
  return normalizeDish(dish, 0, type)
}
