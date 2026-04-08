import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { buildPromptContext, assemblePrompt } from '@/lib/promptBuilder'
import { parseSingleDish } from '@/lib/menuParser'
import { validateUrl } from '@/lib/urlValidator'

const MODEL = 'claude-sonnet-4-5'

export async function POST(request: NextRequest) {
  try {
    const { menu_id, position, type, dish_name, custom_prompt } = await request.json()
    if (!menu_id || position === undefined || !type || !dish_name)
      return NextResponse.json({ error: 'menu_id, position, type, dish_name required' }, { status: 400 })

    const sb = createServerClient()
    const { data: menu } = await sb.from('weekly_menus').select('*').eq('id', menu_id).single()
    if (!menu || menu.status !== 'draft') return NextResponse.json({ error: 'Menu is locked' }, { status: 409 })

    const { data: items } = await sb.from('menu_items').select('*, dish:dishes(name)').eq('menu_id', menu_id)
    const otherNames = (items ?? [])
      .filter((i: any) => !(i.type === type && i.position === position))
      .map((i: any) => i.dish?.name)
      .filter(Boolean)

    const ctx = await buildPromptContext()
    const basePrompt = assemblePrompt(ctx, custom_prompt)
    const prompt =
      basePrompt +
      `\n\n### REPLACEMENT TASK\nReplace "${dish_name}" (${type}). Generate exactly 1 replacement dish.\nReturn JSON shaped { "dish": { ... } } with the same fields as before.\nKeep it different from these existing dishes: ${otherNames.join(', ')}.`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    let dish
    let lastErr: any
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        })
        const block = res.content.find((b) => b.type === 'text') as any
        dish = parseSingleDish(block?.text ?? '', type)
        break
      } catch (e) {
        lastErr = e
      }
    }
    if (!dish) return NextResponse.json({ error: `AI parse failed: ${lastErr?.message}` }, { status: 502 })

    const verified = dish.recipe_url ? await validateUrl(dish.recipe_url) : false

    const { data: existing } = await sb.from('dishes').select('id').ilike('name', dish.name).maybeSingle()
    let dish_id: string
    if (existing) {
      await sb
        .from('dishes')
        .update({
          type,
          emoji: dish.emoji,
          recipe_url: verified ? dish.recipe_url : '',
          ingredients: dish.ingredients,
          tags: dish.tags,
          description: dish.description,
          is_new: dish.is_new,
        })
        .eq('id', existing.id)
      dish_id = existing.id
    } else {
      const { data: inserted } = await sb
        .from('dishes')
        .insert({
          name: dish.name,
          type,
          emoji: dish.emoji,
          recipe_url: verified ? dish.recipe_url : '',
          ingredients: dish.ingredients,
          tags: dish.tags,
          description: dish.description,
          is_new: dish.is_new,
        })
        .select('id')
        .single()
      dish_id = inserted!.id
    }

    await sb.from('menu_items').update({ dish_id }).eq('menu_id', menu_id).eq('type', type).eq('position', position)

    const { data: updated } = await sb.from('dishes').select('*').eq('id', dish_id).single()
    return NextResponse.json({ dish: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
