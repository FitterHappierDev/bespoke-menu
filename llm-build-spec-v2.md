# LLM Build Spec v2: The Bespoke Menu Planner

**For AI-assisted development (Claude Code, Cursor, Copilot) · Follow sprint order exactly · Do not skip ahead**

---

## How to Use This Document

This spec is written for an LLM coding assistant. Each sprint is a self-contained task with explicit inputs, outputs, file paths, and acceptance criteria. Work through sprints in order. Do not begin Sprint N+1 until all acceptance criteria for Sprint N pass.

When a section says **"copy exactly"**, reproduce the provided code verbatim. When a section says **"implement"**, write the code from the specification. When a section says **"verify"**, run the stated check and do not proceed until it passes.

---

## Project Context

**What this is:** A private, web-based weekly meal planner for one family and their personal chef. An AI engine generates 5 protein dishes + 5 vegetable sides each week, filtered by dietary constraints, a taste profile, and a feedback loop from previous weeks.

**Two user roles:**
- **Family** — generates menus, curates dishes (edit/regenerate), adds notes, publishes to chef, provides daily feedback ratings
- **Chef** — read-only view of published menu with confirmation flow, proposes dishes via Excel upload

**The core user flows:**
1. Family logs in → sees this week's menu (empty state, draft, or published)
2. Family clicks "Regenerate with AI" → dialog with prompt preview + custom instructions → LLM builds a personalized 5:5 menu
3. Family reviews, regenerates individual dishes via per-dish AI dialog, edits names/URLs, adds notes for chef
4. Family reviews chef proposals (accept/decline)
5. Family clicks "Publish to Chef" → menu locks (wand/edit buttons grayed out, publish button disabled)
6. Chef logs in → sees published menu with ingredients, recipe links, family notes, historical context → adds chef notes → clicks "Confirm"
7. Family rates dishes daily in the Feedback tab (3-tier: loved/ok/disliked) → submits batch at end of week → feeds next AI generation

**Menu status lifecycle:** Empty → Draft → Published → Confirmed → Feedback Open → Feedback Submitted. One-directional only. Each status controls which UI elements are active/disabled.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| UI Components | shadcn/ui (install: Button, Card, Badge, Dialog, Textarea, Input, Label, Switch, Select, Progress, Separator, Alert) |
| Icons | lucide-react |
| Styling | Tailwind CSS with custom theme tokens |
| Typography | Fraunces (serif headings), system sans-serif (body) |
| Database | Supabase (hosted Postgres) |
| Auth | Next.js middleware + env-var passcodes |
| AI | Anthropic Claude API (`claude-sonnet-4-5`) via `@anthropic-ai/sdk` |
| Excel parsing | SheetJS (`xlsx` package, client-side) |
| Deployment | Vercel |

---

## Environment Variables

Create `.env.local` in the project root. Never commit this file.

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
FAMILY_CODE=kitchen2025
CHEF_CODE=chef2025
```

---

## Design System: "Clean Culinary Minimalism"

Copy this into your Tailwind theme configuration. Every component uses these tokens — no hardcoded colors anywhere.

```css
:root {
  --background: #FEFCF8;
  --foreground: #2C2C2C;
  --card: #FFFFFF;
  --card-foreground: #2C2C2C;
  --primary: #8B9D7A;
  --primary-foreground: #FFFFFF;
  --secondary: #F5F3EF;
  --secondary-foreground: #2C2C2C;
  --muted: #E8E5DF;
  --muted-foreground: #6B6B6B;
  --accent: #F5F3EF;
  --accent-foreground: #2C2C2C;
  --destructive: #D4886E;
  --destructive-foreground: #FFFFFF;
  --border: rgba(44, 44, 44, 0.1);
  --input: transparent;
  --input-background: #F5F3EF;
  --ring: #8B9D7A;
  --radius: 0.75rem;
}
```

**Typography:**
- Heading font: `'Fraunces', ui-serif, Georgia, serif` → use via `.font-serif` class
- Body font: `ui-sans-serif, system-ui, -apple-system, sans-serif`
- Page titles: `font-serif text-3xl md:text-4xl` (34px)
- Section headers: `font-serif text-xl` or `text-2xl`
- Dish names: `font-medium text-sm` (14px semibold)
- Dish descriptions: `text-xs text-muted-foreground italic`
- Ingredient badges: `text-[10px] px-1.5 py-0` with `variant="outline"`
- Action icon buttons: `h-7 w-7` with `w-3 h-3` icons

---

## TypeScript Types

Create `types/index.ts` with exactly these types:

```typescript
export type DishType = 'protein' | 'veg'
export type MenuStatus = 'draft' | 'published' | 'confirmed' | 'feedback_open' | 'feedback_submitted'
export type FeedbackRating = 'loved' | 'ok' | 'disliked'
export type ProposalStatus = 'proposed' | 'accepted' | 'declined'

export interface Dish {
  id: string
  name: string
  type: DishType
  emoji: string
  recipe_url: string
  ingredients: string[]
  description: string
  is_new: boolean
  created_at: string
}

export interface WeeklyMenu {
  id: string
  week_start: string
  status: MenuStatus
  published_at: string | null
  confirmed_at: string | null
  chef_notes: Record<string, string> | null
  created_at: string
}

export interface MenuItem {
  id: string
  menu_id: string
  dish_id: string
  type: DishType
  position: number
  family_note: string
  dish?: Dish
}

export interface DailyFeedback {
  id: string
  menu_item_id: string
  dish_id: string
  rating: FeedbackRating | null
  note: string
  rated_at: string | null
  batch_id: string | null
  created_at: string
}

export interface FeedbackBatch {
  id: string
  week_start: string
  submitted_at: string
  dish_count: number
  summary: {
    loved: number
    ok: number
    disliked: number
    notes: string[]
  }
}

export interface ChefProposal {
  id: string
  week_start: string
  dish_name: string
  type: DishType
  ingredients: string[]
  recipe_url: string
  chef_notes: string
  prep_time_min: number | null
  emoji: string
  status: ProposalStatus
  created_at: string
}

export interface Config {
  id: string
  system_prompt: string
  allergy_constraints: string
  dietary_rules: {
    low_sodium: boolean
    low_carb: boolean
    no_added_sugar: boolean
    lean_portion_reduction: boolean
    introduce_new_dishes: boolean
  }
  taste_profile: string
  chef_max_protein: number
  chef_max_veg: number
  family_email: string
  chef_email: string
  notification_prefs: Record<string, boolean>
  updated_at: string
}

// AI generation output shape
export interface GeneratedDish {
  name: string
  emoji: string
  recipe_url: string
  tags: string[]
  ingredients: string[]
  description: string
  is_new: boolean
}

// UI state derived from menu status
export interface UIState {
  canGenerate: boolean
  canEditDishes: boolean
  canPublish: boolean
  canConfirm: boolean
  canAddChefNote: boolean
  canRate: boolean
  canSubmitFeedback: boolean
  isReadOnly: boolean
}
```

---

## Status Machine

Create `lib/statusMachine.ts`. This is referenced by every API route and UI component.

```typescript
import type { MenuStatus, UIState } from '@/types'

const VALID_TRANSITIONS: Record<MenuStatus, MenuStatus[]> = {
  draft:              ['published'],
  published:          ['confirmed'],
  confirmed:          ['feedback_open'],
  feedback_open:      ['feedback_submitted'],
  feedback_submitted: [],
}

export function canTransition(from: MenuStatus, to: MenuStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getUIState(status: MenuStatus | null): UIState {
  return {
    canGenerate:       status === null || status === 'draft',
    canEditDishes:     status === 'draft',
    canPublish:        status === 'draft',
    canConfirm:        status === 'published',
    canAddChefNote:    status === 'published',
    canRate:           status === 'confirmed' || status === 'feedback_open',
    canSubmitFeedback: status === 'feedback_open',
    isReadOnly:        status !== null && status !== 'draft',
  }
}
```

---

## Week Utilities

Create `lib/weekUtils.ts`:

```typescript
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
```

---

## File/Folder Structure

```
bespoke-menu/
├── app/
│   ├── layout.tsx                         # Root layout, Fraunces font import
│   ├── page.tsx                           # Login / role selection
│   ├── family/
│   │   ├── layout.tsx                     # Family shell (header + desktop nav + mobile bottom nav)
│   │   ├── page.tsx                       # Redirect to /family/menu
│   │   ├── menu/page.tsx                  # This Week's Menu (planning view)
│   │   ├── feedback/page.tsx              # Daily Feedback (rating view)
│   │   ├── history/page.tsx               # Dish History
│   │   └── settings/page.tsx              # Configuration (all panels)
│   ├── chef/
│   │   ├── layout.tsx                     # Chef shell (header + nav)
│   │   ├── page.tsx                       # Redirect to /chef/menu
│   │   ├── menu/page.tsx                  # Kitchen Menu (read-only + confirm)
│   │   └── propose/page.tsx               # Propose Dishes (Excel upload)
│   └── api/
│       ├── auth/route.ts                  # POST: validate passcode, set cookie
│       ├── menu/route.ts                  # GET: menu + items + proposals for a week_start
│       ├── generate/route.ts              # POST: whole-menu AI generation
│       ├── generate-dish/route.ts         # POST: single-dish AI regeneration
│       ├── publish/route.ts               # POST: draft → published
│       ├── confirm/route.ts               # POST: published → confirmed
│       ├── feedback/route.ts              # GET/POST: daily feedback per menu_item
│       ├── feedback-batch/route.ts        # POST: submit feedback batch
│       ├── dishes/route.ts                # GET: history, POST: CSV import
│       ├── chef-proposals/route.ts        # GET/POST: proposals
│       ├── chef-proposals/[id]/route.ts   # PATCH: accept/decline
│       └── config/route.ts                # GET/PUT: all config
├── components/
│   ├── ui/                                # shadcn/ui components (auto-generated)
│   ├── DishCard.tsx                       # Family dish card (wand/edit/link/note)
│   ├── FeedbackDishCard.tsx               # Feedback card (3-tier rating)
│   ├── ChefDishCard.tsx                   # Chef's read-only dish card
│   ├── ChefProposalCard.tsx               # Proposal card (accept/decline)
│   ├── WeekNavigator.tsx                  # Back/forward week arrows
│   ├── AiRegenerateDialog.tsx             # Whole-menu AI dialog
│   ├── DishAiRegenerateDialog.tsx         # Per-dish AI dialog
│   ├── PublishDialog.tsx                  # Publish confirmation
│   └── FamilyNav.tsx                      # Client component for nav (usePathname)
├── lib/
│   ├── supabase-server.ts
│   ├── supabase-client.ts
│   ├── promptBuilder.ts
│   ├── menuParser.ts
│   ├── urlValidator.ts
│   ├── statusMachine.ts
│   └── weekUtils.ts
├── middleware.ts
├── styles/
│   └── globals.css
└── types/
    └── index.ts
```

---
---

# SPRINT 1: Foundation

**Goal:** Running Next.js app, Supabase schema (all 8 tables), passcode auth, role-based routing, layout shells with navigation.

---

## S1-T1: Project Scaffolding

```bash
npx create-next-app@14 bespoke-menu \
  --typescript \
  --app \
  --tailwind \
  --src-dir=false \
  --import-alias="@/*"

cd bespoke-menu

npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  @anthropic-ai/sdk \
  xlsx \
  sonner

npx shadcn@latest init
# Choose: Default style, CSS variables: yes, base color: Slate, globals.css path: app/globals.css

npx shadcn@latest add button card badge dialog textarea input label switch select progress separator alert
```

After scaffolding, replace the default Tailwind theme with the Clean Culinary Minimalism tokens from the Design System section above. Add the Fraunces font import to `app/layout.tsx`.

**Verify:** `npm run dev` starts without errors on `localhost:3000`.

---

## S1-T2: Supabase Schema

In your Supabase project, open the SQL editor and run the entire migration from the Tech Design v2, Section 2 ("Full Schema (v2)"). This creates all 8 tables: `dishes`, `weekly_menus`, `menu_items`, `daily_feedback`, `feedback_batches`, `chef_proposals`, `dish_ratings`, `config`.

After running the migration, seed the config row:

```sql
INSERT INTO config (system_prompt, allergy_constraints) VALUES (
  'You are a culinary AI assistant specialized in creating personalized weekly meal plans.

Generate exactly 5 protein-centric dishes and 5 vegetable-centric sides that adhere to the following constraints:

DIETARY RULES:
- Low Sodium: Use citrus, vinegars, and aromatics for flavor instead of salt
- Low Carb: Avoid refined sugars and flour-based thickeners. Limit high-starch vegetables
- No Added Sugar: Zero refined sugar in any dish

PORTION PREFERENCES:
- Prefer leaner protein portions (approximately 20% reduction from standard sizes)

OUTPUT FORMAT:
For each dish, provide:
1. Dish name (clear and appetizing)
2. Emoji (single emoji representing the dish)
3. Recipe URL (link to a verified online recipe)
4. Dietary tags (which constraints it meets)
5. Key ingredients list (5-7 main ingredients)
6. Description (one sentence highlighting preparation style and key flavors)

Introduce 1-2 completely new dishes per week while maintaining variety.',
  'No shellfish
No tree nuts'
);
```

**Verify:** Supabase Table Editor shows 8 tables, config has 1 seeded row.

---

## S1-T3: Supabase Clients + Types

Create `lib/supabase-server.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}
```

Create `lib/supabase-client.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Copy the TypeScript types from the "TypeScript Types" section above into `types/index.ts`.
Copy `lib/statusMachine.ts` and `lib/weekUtils.ts` from the sections above.

---

## S1-T4: Auth Middleware + Login API

Create `middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/api/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }
  const role = request.cookies.get('bespoke_role')?.value
  if (pathname.startsWith('/chef')) {
    if (role === 'chef' || role === 'family') return NextResponse.next()
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (pathname.startsWith('/family') || pathname.startsWith('/api/')) {
    if (role === 'family') return NextResponse.next()
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

Create `app/api/auth/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { passcode } = await request.json()
  let role: string | null = null
  if (passcode === process.env.FAMILY_CODE) role = 'family'
  else if (passcode === process.env.CHEF_CODE) role = 'chef'
  if (!role) return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
  const response = NextResponse.json({ role, success: true })
  response.cookies.set('bespoke_role', role, {
    httpOnly: true, sameSite: 'strict', maxAge: 60 * 60 * 24 * 30, path: '/',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('bespoke_role')
  return response
}
```

---

## S1-T5: Login Page

Create `app/page.tsx` as a `'use client'` component.

**Layout:** Full-screen centered on warm cream background (`bg-background`). Single card, max-width 400px, rounded `rounded-xl`, shadow, padding `p-10`, text-center.

**Card contents:**
1. ChefHat icon from lucide-react (24px, `text-primary`), centered
2. Title: `"Bespoke Menu Planner"` in `font-serif text-2xl`
3. Subtitle: `"Private Access"` in `text-sm text-muted-foreground`
4. Role selector: two cards side by side (`grid grid-cols-2 gap-3`), each with emoji icon, role label (uppercase, bold, small), description (muted, xs)
5. Passcode input: `type="password"`, appears after role selection
6. Enter button: full-width, primary filled

**Role cards:**
- Family: 🏡, "FAMILY", "Plan, rate & manage"
- Chef: 👨‍🍳, "CHEF", "View menu & propose"
- Default: Family selected (primary border + light primary bg)
- Selected state: `border-primary bg-primary/5`

**Behavior:**
1. Click role → selected state
2. Type passcode → Enter or click button
3. POST `/api/auth` → on success redirect to `/family/menu` or `/chef/menu`
4. On error: show `"Incorrect passcode"` in destructive color below input

---

## S1-T6: Family Layout Shell

Create `app/family/layout.tsx`. Renders sticky header + desktop nav + mobile bottom nav.

**Header (sticky, `bg-card border-b`, height ~64px):**
- Left: ChefHat icon (24px, `text-primary`) + `"Bespoke Menu Planner"` in `font-serif text-xl`
- Center (desktop only, `hidden md:flex`): Nav links — "This Week" (`/family/menu`), "Feedback" (`/family/feedback`), "History" (`/family/history`), "Settings" (`/family/settings`)
  - Each nav link: icon (Home, Clock, FileText, Settings from lucide-react) + label
  - Active: `bg-primary/10 text-primary`, rounded-lg
  - Inactive: `text-muted-foreground hover:bg-secondary`

**Mobile bottom nav (fixed, `md:hidden`, `bg-card border-t`, height 64px):**
- Same 4 tabs as icon + small label
- Active: `text-primary`
- Min 44×44px touch targets

Extract nav into `components/FamilyNav.tsx` as `'use client'` (needs `usePathname()`).

Create `app/family/page.tsx` that redirects to `/family/menu`.

---

## S1-T7: Chef Layout Shell

Create `app/chef/layout.tsx`. Simpler than family.

**Header:** Same brand on left. Desktop nav on right: "Kitchen Menu" (`/chef/menu`), "Propose Dishes" (`/chef/propose`). No mobile bottom nav (chef uses tablet).

Create `app/chef/page.tsx` that redirects to `/chef/menu`.

---

**Sprint 1 complete when:**
- [ ] `npm run dev` runs clean
- [ ] Supabase has all 8 tables + seeded config row
- [ ] `/` shows login page with correct design system styling (sage green, warm cream, Fraunces headings)
- [ ] Family passcode → redirects to `/family/menu`
- [ ] Chef passcode → redirects to `/chef/menu`
- [ ] Invalid passcode → error shown
- [ ] `/family/*` without cookie → redirects to `/`
- [ ] `/chef/*` without cookie → redirects to `/`
- [ ] Family layout shows header + 4 desktop nav tabs + mobile bottom nav
- [ ] Chef layout shows header + 2 nav links

---
---

# SPRINT 2: Weekly Menu + State Machine

**Goal:** Full "This Week's Menu" view with dish cards, week navigation, two-tier AI regeneration, publish flow with post-publish locking, and chef proposals.

---

## S2-T1: Menu API Route

Create `app/api/menu/route.ts`:

```typescript
// GET /api/menu?week_start=2026-04-06
// Returns:
// {
//   menu: WeeklyMenu | null,
//   protein_items: (MenuItem & { dish: Dish })[]
//   veg_items: (MenuItem & { dish: Dish })[]
//   proposals: ChefProposal[]
//   feedback_context: { rating: string, label: string }[]
// }
//
// If week_start is omitted, use current week (Monday).
// Items include joined dish data.
// Proposals filtered by week_start.
// feedback_context = last 5 rated items from daily_feedback with notes, for display.
```

---

## S2-T2: Prompt Builder

Create `lib/promptBuilder.ts`:

```typescript
// buildPromptContext(): loads from database:
//   1. config (system_prompt, allergy_constraints, dietary_rules, taste_profile)
//   2. Last submitted feedback batch (daily_feedback WHERE batch_id IS NOT NULL, recent)
//   3. Top 10 "loved" dishes (from daily_feedback), sorted by rated_at DESC
//   4. All "disliked" dishes (from daily_feedback, all time)
//   5. Legacy dish_ratings (for historical priming)
//
// assemblePrompt(context, customInstructions?): builds the 7-layer prompt:
//   [1] System prompt
//   [2] Allergy constraints (split on \n, each becomes "NEVER include X")
//   [3] Dietary rule flags
//   [4] Taste profile (if non-empty, wrapped in "### FAMILY TASTE PROFILE")
//   [5] Recent feedback batch
//   [6] Top-rated dishes
//   [7] Excluded dishes
//   + Custom instructions (if provided)
//   + Output schema requirement (JSON with protein_dishes[] and veg_dishes[])
```

---

## S2-T3: Menu Parser

Create `lib/menuParser.ts`:

```typescript
// parseMenuResponse(rawText: string): { protein_dishes: GeneratedDish[], veg_dishes: GeneratedDish[] }
//
// 1. Extract JSON from response (strip markdown fences if present)
// 2. Validate exactly 5 protein_dishes and 5 veg_dishes
// 3. Validate each dish has: name, emoji, recipe_url, tags[], ingredients[], description
// 4. Default missing fields (tags → ['Low Sodium', 'Low Carb', 'No Sugar'], is_new → false)
// 5. Throw descriptive error if validation fails
```

---

## S2-T4: Generate API Route (Whole Menu)

Create `app/api/generate/route.ts`:

```typescript
// POST /api/generate
// Body: { week_start: string, custom_prompt?: string }
//
// 1. Build prompt context from database
// 2. Assemble the 7-layer prompt + custom instructions
// 3. Call Claude API (max 2 attempts if parsing fails)
// 4. Parse and validate the 10-dish response
// 5. Validate recipe URLs (async HEAD requests, flag unverified)
// 6. Upsert 10 dishes into `dishes` table (match by name, or insert new)
// 7. Create or update `weekly_menus` row (status: 'draft')
// 8. Insert 10 `menu_items` rows
// 9. Return the full menu data to client
```

---

## S2-T5: Generate Dish API Route (Single Dish)

Create `app/api/generate-dish/route.ts`:

```typescript
// POST /api/generate-dish
// Body: { menu_id: string, position: number, type: 'protein'|'veg', dish_name: string, custom_prompt?: string }
//
// 1. Build same prompt context as whole menu
// 2. Append: "Replace '[dish_name]' ([type]). Generate exactly 1 replacement dish.
//    Keep it different from these existing dishes: [list other 9 dishes]."
// 3. Append custom instructions if provided
// 4. Call Claude API
// 5. Parse single dish from response
// 6. Upsert into `dishes` table
// 7. Update the `menu_items` row at the given position
// 8. Return the new dish to client
```

---

## S2-T6: Publish API Route

Create `app/api/publish/route.ts`:

```typescript
// POST /api/publish
// Body: { menu_id: string }
//
// 1. Fetch menu, verify status === 'draft' using canTransition()
// 2. Update: status='published', published_at=now()
// 3. Return success
//
// If status is not 'draft', return 409 Conflict.
```

---

## S2-T7: WeekNavigator Component

Create `components/WeekNavigator.tsx`:

```typescript
// Props: weekStart: string, offset: number, onNavigate: (newOffset: number) => void
//
// Renders: ChevronLeft button | "Week of April 6, 2026" label | ChevronRight button
// ChevronRight disabled when offset >= 1 (max 1 week into future), opacity-30 when disabled
// Both buttons: size="icon" variant="ghost" className="h-6 w-6"
```

---

## S2-T8: DishCard Component

Create `components/DishCard.tsx`:

```typescript
interface DishCardProps {
  dish: Dish & { familyNote?: string }
  note: string
  isPublished: boolean  // drives grayed-out state
  onNoteChange: (note: string) => void
  onRegenerate: () => void
  onEdit: () => void
}
```

**Visual spec (matches Figma prototype):**

Card: `p-3 hover:shadow-md transition-all duration-200`, rounded-xl (from shadcn Card)

Layout: flex row with gap-3
- Left: emoji `text-3xl leading-none pt-0.5`
- Right: flex-1 column:
  1. Name row: `font-medium text-sm truncate` + "New" badge if `is_new` (`bg-primary text-[10px] px-1.5 py-0`)
  2. Ingredient badges: flex-wrap gap-1, each `Badge variant="outline" text-[10px] px-1.5 py-0`
  3. Description: `text-xs text-muted-foreground italic mb-2`
  4. Family note (if exists): `text-xs text-muted-foreground italic bg-secondary/50 rounded px-2 py-1 mb-2`
  5. Action buttons row: flex gap-1
     - Wand2 (regenerate): `size="icon" variant="outline" h-7 w-7`, **`disabled={isPublished}`**
     - Edit2 (edit): `size="icon" variant="outline" h-7 w-7`, **`disabled={isPublished}`**
     - ExternalLink (recipe): `size="icon" variant="ghost" h-7 w-7 ml-auto`, only if recipe_url exists, links to URL in new tab
     - Plus (add note): `size="icon" variant="ghost" h-7 w-7`, toggles note textarea

Note textarea (shown when plus clicked): `text-xs min-h-[48px]` with "Done" button below.

---

## S2-T9: ChefProposalCard Component

Create `components/ChefProposalCard.tsx`:

```typescript
// Props: proposal: ChefProposal, onAccept: () => void, onDecline: () => void
//
// Card styling: border-primary/30 bg-primary/5 (distinguishes from regular cards)
// Layout: same as DishCard but with:
//   - "Chef's Proposal" outline badge next to name
//   - Chef note in italics with quotes
//   - If status === 'proposed': ThumbsUp (accept) + ThumbsDown (decline) buttons
//   - If status === 'accepted': green "Accepted" badge
//   - If status === 'declined': destructive "Declined" badge
```

---

## S2-T10: AI Regeneration Dialogs

Create `components/AiRegenerateDialog.tsx`:

```typescript
// Props: open, onOpenChange, onGenerate, isGenerating
// Shows:
//   Title: Wand2 icon + "Regenerate Menu with AI"
//   Description: "Review the current prompt or add custom instructions."
//   Body:
//     1. Label "Current prompt" + read-only div (bg-secondary/50 rounded-lg px-3 py-2.5) showing defaultPrompt
//     2. Label "Additional instructions (optional)" + Textarea (3 rows, placeholder "e.g. Include a lamb dish...")
//   Footer: Cancel (outline) + Generate Menu (primary, shows spinner when isGenerating)
```

Create `components/DishAiRegenerateDialog.tsx`:

```typescript
// Props: open, onOpenChange, onGenerate, isGenerating, dish (the dish being replaced)
// Shows:
//   Title: Wand2 icon + "Regenerate [Protein/Vegetable] with AI"
//   Description: 'Regenerate "[dish.name]" with optional custom instructions.'
//   Body: Only the custom instructions Textarea (no default prompt shown)
//   Footer: Cancel (outline) + Generate Dish (primary, shows spinner when isGenerating)
```

---

## S2-T11: This Week's Menu Page

Create `app/family/menu/page.tsx` as a `'use client'` component. This is the most complex page.

**State:**
```typescript
const [weekOffset, setWeekOffset] = useState(0)
const [menuData, setMenuData] = useState<MenuData | null>(null)
const [isPublished, setIsPublished] = useState(false)
const [hasMenu, setHasMenu] = useState(false)
const [mobileTab, setMobileTab] = useState<'protein' | 'veg'>('protein')
const [aiDialogOpen, setAiDialogOpen] = useState(false)
const [dishAiDialogOpen, setDishAiDialogOpen] = useState(false)
const [regeneratingDish, setRegeneratingDish] = useState<Dish | null>(null)
const [publishDialogOpen, setPublishDialogOpen] = useState(false)
const [dishNotes, setDishNotes] = useState<Record<string, string>>({})
```

**On mount and when weekOffset changes:** Fetch `GET /api/menu?week_start={computed}`. Set `isPublished` based on `menu.status !== 'draft'`. Set `hasMenu` based on whether menu exists.

**Empty state (no menu):**
- Centered layout: large Sparkles icon in primary circle, serif title "Ready to plan this week's menu?", description text, "Generate with AI" button

**Menu state:**
1. **Header:** serif title "This Week's Menu" + WeekNavigator below + right side: "Regenerate with AI" outline button (disabled if isPublished) + "Publish to Chef" primary button (disabled if isPublished, text changes to "Published")
2. **Mobile tabs (md:hidden):** Proteins / Vegetables tab bar with Badge counters, underline indicator on active tab
3. **Mobile dish list:** Single column, filtered by active tab
4. **Desktop layout (hidden md:grid):** Column headers (serif "Proteins" + badge, "Vegetables" + badge), then paired rows: protein[0] + veg[0], protein[1] + veg[1], etc.
5. **Chef proposals section:** Below menu, only if proposals exist. Serif "Chef's Proposals" header + pending count badge. Grid of ChefProposalCards.
6. **Dialogs:** Edit dish dialog, Publish dialog, AI regenerate dialog, Per-dish AI dialog

**Publish flow:**
1. Click "Publish to Chef" → open PublishDialog
2. Confirm → POST `/api/publish` with menu_id
3. On success: set `isPublished = true`, close dialog, show toast "Menu published to chef ✓"
4. All Wand/Edit buttons now grayed out. Publish button shows "Published" (disabled).

---

**Sprint 2 complete when:**
- [ ] Empty state shows when no menu exists
- [ ] "Generate with AI" opens the AI dialog with prompt preview + custom instructions
- [ ] Generation produces 10 dish cards with name, emoji, ingredients badges, description, tags
- [ ] DishCards show wand/edit/link/note buttons
- [ ] Per-dish wand button opens streamlined AI dialog with dish name context
- [ ] Edit dialog allows changing dish name and recipe URL
- [ ] Note toggle shows/hides textarea per card
- [ ] WeekNavigator arrows work, forward disabled at +1 week
- [ ] Past weeks show read-only state (buttons disabled)
- [ ] Publish dialog opens, confirms, locks menu (wand/edit grayed, publish shows "Published")
- [ ] Chef proposals render with accept/decline
- [ ] Mobile tabs filter between Proteins and Vegetables
- [ ] Desktop shows paired two-column layout

---
---

# SPRINT 3: Daily Feedback

**Goal:** Full "Rate This Week" feedback flow with 3-tier ratings, progressive note disclosure, batch submission.

---

## S3-T1: Feedback API Route

Create `app/api/feedback/route.ts`:

```typescript
// GET /api/feedback?week_start=2026-04-06
// Returns all daily_feedback rows for this week's menu_items, joined with dish data.
// If no feedback rows exist yet, auto-create one per menu_item (rating: null, note: '').
//
// POST /api/feedback
// Body: { menu_item_id: string, rating: 'loved'|'ok'|'disliked'|null, note?: string }
// Upserts the daily_feedback row. Sets rated_at = now() if rating is non-null.
// Returns the updated row.
```

---

## S3-T2: Feedback Batch API Route

Create `app/api/feedback-batch/route.ts`:

```typescript
// POST /api/feedback-batch
// Body: { week_start: string }
//
// 1. Create a feedback_batches row with summary (loved/ok/disliked counts, notes array)
// 2. Update all daily_feedback rows for this week: set batch_id = new batch id
// 3. Update weekly_menus status → 'feedback_submitted' (validate transition)
// 4. Return the batch summary
```

---

## S3-T3: FeedbackDishCard Component

Create `components/FeedbackDishCard.tsx`:

```typescript
// Props: dish, rating, note, ratedAt, onRating, onNoteChange
```

**Visual spec (matches Figma prototype):**

Card: `p-3`, standard rounded card

Layout: flex row with gap-2
- Left: emoji `text-3xl flex-shrink-0`
- Right: flex-1 column:
  1. Dish name: `font-medium text-sm mb-2`
  2. Rating buttons: `grid grid-cols-3 gap-1.5 mb-2`. Each button is 36px min-height, rounded-lg, border-2:
     - 😍 Loved: selected = `bg-primary border-primary text-primary-foreground shadow-md`
     - 😐 OK: selected = `bg-muted border-muted-foreground text-foreground shadow-md`
     - 👎 Disliked: selected = `bg-destructive/10 border-destructive text-destructive shadow-md`
     - Unselected: `border-muted-foreground/30 hover:border-[color]/50`
     - Each shows emoji (text-lg) + label (text-[10px])
     - **Always visible — no "Eaten" gate**
  3. Note area (only shown if rating is non-null):
     - If note exists: textarea with note text
     - If no note: "Add a note" ghost button (MessageSquare icon + text, full-width centered)
     - Clicking shows textarea + "Done" button
  4. Rated date (if exists): `text-[10px] text-muted-foreground`, "Rated on 4/6/2026"

---

## S3-T4: Daily Feedback Page

Create `app/family/feedback/page.tsx` as a `'use client'` component.

**Layout:** `max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8` (pb-24 for mobile bottom nav clearance)

**Header:** serif "Rate This Week", muted "Week of April 6, 2026"

**Progress summary card:** Card with `p-6 mb-6`:
- Progress bar with "X of 10 rated" label
- Sentiment counters: 😍 count, 😐 count, 👎 count (each as `text-2xl font-serif`)
- "Submit Feedback (X dishes)" primary button, full-width, disabled if 0 rated

**Dish cards:** `space-y-3`, all 10 FeedbackDishCards

**Submit dialog:** Confirmation with rated counts breakdown, "Once submitted, you won't be able to edit" warning, Confirm/Cancel buttons.

**On submit:** POST `/api/feedback-batch` → toast "Feedback submitted" → disable submit button.

---

**Sprint 3 complete when:**
- [ ] Feedback page shows all 10 dishes with rating buttons always visible
- [ ] Tapping a rating selects it (visual state change), tapping same deselects
- [ ] Auto-save: each rating change POSTs immediately
- [ ] "Add a note" appears only after rating is selected
- [ ] Progress bar and sentiment counts update in real-time
- [ ] Submit dialog shows breakdown and warning
- [ ] After submission, feedback is locked

---
---

# SPRINT 4: Chef Views

**Goal:** Chef Kitchen Menu (read-only + confirm) and Chef Propose Dishes (Excel upload + status).

---

## S4-T1: Confirm API Route

Create `app/api/confirm/route.ts`:

```typescript
// POST /api/confirm
// Body: { menu_id: string, chef_notes?: Record<string, string> }
//
// 1. Validate menu.status === 'published' using canTransition()
// 2. Update: status='confirmed', confirmed_at=now(), chef_notes=provided notes
// 3. Return success
```

---

## S4-T2: Chef Proposals API Routes

Create `app/api/chef-proposals/route.ts`:
```typescript
// GET /api/chef-proposals?week_start=2026-04-06
// Returns all proposals for the week.
//
// POST /api/chef-proposals
// Body: { dishes: ChefProposal[] }
// Validates against config.chef_max_protein and config.chef_max_veg limits.
// Inserts rows with status='proposed'.
```

Create `app/api/chef-proposals/[id]/route.ts`:
```typescript
// PATCH /api/chef-proposals/:id
// Body: { status: 'accepted' | 'declined' }
// Updates the proposal status. Family role only.
```

---

## S4-T3: ChefDishCard Component

Create `components/ChefDishCard.tsx`:

```typescript
// Props: dish (with ingredients, tags, familyNote, previousRating, previousNote, lastServed, chefNote),
//        readOnly: boolean, onAddNote: (note: string) => void
```

**Visual spec (from Figma ChefKitchenMenu.tsx):**

Card: `p-6`, larger than family dish cards

Layout: flex row with gap-4
- Left: emoji `text-4xl`
- Right: flex-1:
  1. Name + recipe link button (top-right)
  2. Dietary tags as outline badges
  3. "Ingredients:" label (xs, muted) + ingredient list as comma-separated text
  4. Family Note (if exists): secondary bg rounded-lg `p-3` with label
  5. Historical context (if previousRating exists): `bg-accent/50 rounded-lg p-3` with "Last served [date]" label + emoji rating + quoted previous note
  6. Chef Note area:
     - If not readOnly: "Add chef note" ghost button → textarea + Save/Cancel
     - If readOnly and chefNote exists: `bg-primary/10 rounded-lg p-3` showing note

---

## S4-T4: Chef Kitchen Menu Page

Create `app/chef/menu/page.tsx`:

**Header:** serif "Kitchen Menu", "Week of April 6, 2026", status badge (Published or Confirmed)

**If published:** Info banner: "The family has published this week's menu. Review all dishes and confirm when ready."

**Sections:** "Proteins" + count badge → grid of ChefDishCards. "Vegetables" + count badge → grid of ChefDishCards.

**Confirm button (if status === 'published'):** "Confirm Menu" primary button in header area. Opens confirm dialog with dish counts. On confirm: POST `/api/confirm`, updates status badge to "Confirmed".

**Real-time:** Supabase subscription on `weekly_menus` table. When status changes to `published`, refresh page data.

---

## S4-T5: Chef Propose Dishes Page

Create `app/chef/propose/page.tsx`:

**Sections:**
1. Template format card (required + optional columns explained)
2. Upload area: dashed border, drag-and-drop zone, file input for .xlsx
3. Preview (after upload): parsed dishes as cards with remove button, validation errors as Alert
4. Submit button: validates against limits, POSTs to API
5. Previously submitted proposals: list with status badges (Pending/Accepted/Declined)

**Excel parsing:** Use SheetJS (`xlsx` package) client-side. Parse first sheet. Map column headers to expected fields. Validate required fields (name, type, ingredients).

---

**Sprint 4 complete when:**
- [ ] Chef menu shows all 10 dishes with ingredients, tags, recipe links, family notes
- [ ] Historical context shows for dishes served before (last served date, rating, note)
- [ ] Chef can add notes to each dish (textarea + save)
- [ ] Confirm dialog works, status changes to "Confirmed"
- [ ] Chef propose page shows template format instructions
- [ ] Upload zone accepts .xlsx files
- [ ] Preview shows parsed dishes with validation
- [ ] Submit enforces limits from config
- [ ] Previously submitted proposals show with status badges
- [ ] Real-time: publishing menu while chef view is open updates within 2 seconds

---
---

# SPRINT 5: Configuration

**Goal:** Single scrollable settings page with all config panels saving to database.

---

## S5-T1: Config API Route

Create `app/api/config/route.ts`:
```typescript
// GET /api/config → returns the single config row
// PUT /api/config → body: Partial<Config>, updates provided fields, returns updated row
```

---

## S5-T2: Configuration Page

Create `app/family/settings/page.tsx` as a single scrollable page with grouped cards:

1. **System Prompt:** serif heading + description + monospace textarea (15 rows)
2. **Allergy Constraints:** textarea (4 rows, one constraint per line, placeholder: "No shellfish\nNo tree nuts")
3. **Dietary Rules:** Switch toggles for Low Sodium, Low Carb, No Added Sugar (each with label + description, separated by Separator)
4. **Taste Profile:** Description + "Download Template" button (generates .md blob) + "Upload Profile" button (file input for .md/.txt) + textarea showing uploaded content (editable, monospace, 10 rows)
5. **Chef Proposal Limits:** Two number inputs (1-5) for max protein and max veg
6. **Email Notifications:** Two email inputs (family, chef)
7. **Save Configuration** primary button at bottom

On save: PUT `/api/config` with all fields → toast "Configuration saved ✓".
Taste profile download: generate markdown blob from template, trigger browser download.
Taste profile upload: FileReader reads .md file, populates textarea.

---

**Sprint 5 complete when:**
- [ ] All config fields load from database on page mount
- [ ] System prompt edits persist
- [ ] Allergy constraints save as plain text
- [ ] Dietary toggles save to config.dietary_rules
- [ ] Taste profile upload populates textarea, download generates .md file
- [ ] Chef limits save (validated 1-5)
- [ ] Email fields save
- [ ] Save button updates all fields in one PUT call
- [ ] Saved config is used by next AI generation (verify by regenerating)

---
---

# SPRINT 6: Dish History + Polish

**Goal:** History page, CSV import, error handling, responsive polish.

---

## S6-T1: Dishes API Route

Create `app/api/dishes/route.ts`:
```typescript
// GET /api/dishes?type=protein|veg&rating=loved|ok|disliked&q=search
// Returns dishes with their most recent daily_feedback rating and note.
// Includes timesServed count and lastServed date.
//
// POST /api/dishes
// Body: { dishes: Partial<Dish & { rating?: string, note?: string, served_date?: string }>[] }
// Batch import from CSV. Upserts dishes by name. Creates dish_ratings for priming.
```

---

## S6-T2: Dish History Page

Create `app/family/history/page.tsx`:

**Stats row:** 4 cards (Total, Loved, OK, Disliked) with emoji counters

**Filters card:** Search input (with Search icon) + Select for rating filter (All/Loved/OK/Disliked) + Select for type filter (All/Proteins/Vegetables)

**Results:** Cards for each dish showing: emoji, name + rating emoji, dietary tags + type badge, last served date + times served count, family note in secondary bg, recipe link button.

**Empty state:** "No dishes found matching your filters."

---

## S6-T3: Error States

Add error handling to every page and API call:

- API routes: all return `{ error: string }` on failure with appropriate HTTP status
- Family menu — generation failure: red Alert below header with retry button
- Family menu — empty history tip: "Rate dishes in Feedback to personalize future menus"
- Network errors: catch in fetch calls, show toast with error message
- Loading states: skeleton cards or spinner while data loads

---

## S6-T4: Responsive Polish

- Verify all pages work at 375px width (iPhone SE)
- Mobile bottom nav clears content (pb-24 on all family pages)
- Feedback cards: rating buttons are minimum 36px tall
- Chef menu: cards stack to single column on mobile
- Tables (if any) scroll horizontally on mobile
- Dialogs are full-width on mobile with proper padding

---

**Sprint 6 complete when:**
- [ ] Dish history loads with search and filter working
- [ ] Stats cards show correct counts
- [ ] CSV import creates dishes and ratings
- [ ] All error states show user-friendly messages
- [ ] All pages render correctly at 375px width
- [ ] Mobile bottom nav doesn't overlap content
- [ ] Full end-to-end flow works: login → generate → edit → publish → chef confirm → feedback → submit → next week generates with feedback context

---

## Deployment

```bash
npm i -g vercel
vercel
vercel env add ANTHROPIC_API_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add FAMILY_CODE production
vercel env add CHEF_CODE production
vercel --prod
```

Verify:
- [ ] Login works with both passcodes
- [ ] Generate menu works (API key is live)
- [ ] Publish → chef sees menu → confirm works
- [ ] Feedback submission works
- [ ] Chef propose dishes with Excel works
- [ ] Configuration saves persist
- [ ] Week navigation shows correct data per week
