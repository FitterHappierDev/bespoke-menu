import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { buildPromptContext, assemblePrompt } from '@/lib/promptBuilder'
import { parseMenuResponse } from '@/lib/menuParser'
import { validateUrls } from '@/lib/urlValidator'
import type { GeneratedDish } from '@/types'

const MODEL = 'claude-sonnet-4-5'

async function callModel(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = res.content.find((b) => b.type === 'text') as any
  return block?.text ?? ''
}

export async function POST(request: NextRequest) {
  try {
    const { week_start, custom_prompt } = await request.json()
    if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })

    const sb = createServerClient()
    const ctx = await buildPromptContext()
    const prompt = assemblePrompt(ctx, custom_prompt)

    let parsed
    let lastErr: any
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callModel(prompt)
        parsed = parseMenuResponse(text)
        break
      } catch (e) {
        lastErr = e
      }
    }
    if (!parsed) return NextResponse.json({ error: `AI parse failed: ${lastErr?.message}` }, { status: 502 })

    const allDishes: { d: GeneratedDish; type: 'protein' | 'veg' }[] = [
      ...parsed.protein_dishes.map((d) => ({ d, type: 'protein' as const })),
      ...parsed.veg_dishes.map((d) => ({ d, type: 'veg' as const })),
    ]

    const urlMap = await validateUrls(allDishes.map((x) => x.d.recipe_url).filter(Boolean))

    // Upsert dishes (match by name)
    const dishIds: string[] = []
    for (const { d, type } of allDishes) {
      const verified = urlMap[d.recipe_url] !== false
      const { data: existing } = await sb.from('dishes').select('id').ilike('name', d.name).maybeSingle()
      if (existing) {
        await sb
          .from('dishes')
          .update({
            type,
            emoji: d.emoji,
            recipe_url: verified ? d.recipe_url : '',
            ingredients: d.ingredients,
            tags: d.tags,
            description: d.description,
            is_new: d.is_new,
          })
          .eq('id', existing.id)
        dishIds.push(existing.id)
      } else {
        const { data: inserted, error: insertErr } = await sb
          .from('dishes')
          .insert({
            name: d.name,
            type,
            emoji: d.emoji,
            recipe_url: verified ? d.recipe_url : '',
            ingredients: d.ingredients,
            tags: d.tags,
            description: d.description,
            is_new: d.is_new,
          })
          .select('id')
          .single()
        if (insertErr || !inserted) throw new Error(`Failed to insert dish "${d.name}": ${insertErr?.message}`)
        dishIds.push(inserted.id)
      }
    }

    // Upsert weekly_menus
    let { data: menu } = await sb.from('weekly_menus').select('*').eq('week_start', week_start).maybeSingle()
    if (!menu) {
      const { data: newMenu } = await sb
        .from('weekly_menus')
        .insert({ week_start, status: 'draft' })
        .select('*')
        .single()
      menu = newMenu!
    } else {
      if (menu.status !== 'draft') {
        return NextResponse.json({ error: 'Menu is locked' }, { status: 409 })
      }
      await sb.from('menu_items').delete().eq('menu_id', menu.id)
    }

    const items = allDishes.map((x, idx) => ({
      menu_id: menu!.id,
      dish_id: dishIds[idx],
      type: x.type,
      position: x.type === 'protein' ? idx : idx - 5,
      family_note: '',
    }))
    await sb.from('menu_items').insert(items)

    return NextResponse.json({ success: true, menu_id: menu.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
