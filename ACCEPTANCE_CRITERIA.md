# Bespoke Menu Planner — Acceptance Criteria

Compiled from sprints 1–6. Check items off as you verify in the running app.

---

## Sprint 1 — Foundation

- [ ] `npm run dev` runs clean on `localhost:3000`
- [ ] Supabase has all 8 tables (`dishes`, `weekly_menus`, `menu_items`, `daily_feedback`, `feedback_batches`, `chef_proposals`, `dish_ratings`, `config`) plus the seeded `config` row
- [ ] `/` shows the login page with the design system (sage green, warm cream, Fraunces headings)
- [ ] Family passcode → redirects to `/family/menu`
- [ ] Chef passcode → redirects to `/chef/menu`
- [ ] Invalid passcode → "Incorrect passcode" error in destructive color
- [ ] Visiting `/family/*` without the cookie → redirects to `/`
- [ ] Visiting `/chef/*` without the cookie → redirects to `/`
- [ ] Family layout shows header + 4 desktop nav tabs + mobile bottom nav
- [ ] Chef layout shows header + 2 nav links

---

## Sprint 2 — Weekly Menu + State Machine

- [ ] Empty state shows when no menu exists for the week
- [ ] "Generate with AI" opens the AI dialog with prompt preview + custom instructions
- [ ] Generation produces 10 dish cards with name, emoji, ingredient badges, description
- [ ] Each `DishCard` shows wand / edit / external-link / note buttons
- [ ] Per-dish wand opens the streamlined per-dish AI dialog with the dish name in context
- [ ] Edit dialog allows changing dish name and recipe URL (and saves)
- [ ] Note toggle shows/hides the textarea per card; saved notes persist after reload
- [ ] WeekNavigator arrows work; forward arrow disabled at offset +1 (opacity 30)
- [ ] Past weeks (offset −1 or earlier) are read-only — wand/edit/publish disabled
- [ ] Publish dialog opens, confirms, locks the menu (wand/edit grayed, publish shows "Published")
- [ ] Chef proposals render with accept/decline buttons; clicking flips the badge
- [ ] Mobile (<768px): tab bar filters between Proteins and Vegetables
- [ ] Desktop (≥768px): paired two-column layout (protein[i] beside veg[i])

---

## Sprint 3 — Daily Feedback

- [ ] Feedback page shows all 10 dishes with the three rating buttons always visible
- [ ] Tapping a rating selects it (visual change); tapping the same rating deselects
- [ ] Auto-save: each rating change POSTs to `/api/feedback` immediately
- [ ] "Add a note" appears only after a rating is selected
- [ ] Progress bar and sentiment counters update in real time
- [ ] Submit button is disabled at 0 rated, enabled once ≥1 rating
- [ ] Submit dialog shows the loved/ok/disliked breakdown and the "won't be able to edit" warning
- [ ] After submission: toast appears, button shows "Feedback Submitted", inputs become disabled
- [ ] Supabase shows a new `feedback_batches` row with summary, all `daily_feedback` rows tagged with that `batch_id`, and `weekly_menus.status = 'feedback_submitted'`

---

## Sprint 4 — Chef Views

- [ ] `/chef/menu` shows all 10 dishes with ingredients, family notes, recipe links, and the protein/veg + dietary tag badges
- [ ] Historical context block ("Last served … / rating / quoted note") appears for dishes that were rated in a prior week
- [ ] While `published`, the chef can add notes per card via Save/Cancel; saved notes persist immediately (`PATCH /api/menus/:id/chef-notes`) and survive reload before confirmation
- [ ] Confirm dialog shows dish counts; Confirm → toast, status badge flips to "Confirmed", chef notes become read-only, `weekly_menus.confirmed_at` set, `chef_notes` JSON populated
- [ ] Realtime: publishing/changing the menu in another tab updates the open chef view within ~2 seconds (requires Supabase Realtime enabled on `weekly_menus`)
- [ ] `/chef/propose` shows the Template Format card listing required (`dish_name`, `type`, `ingredients`) and optional columns
- [ ] Drop or click-upload an `.xlsx` → preview shows parsed rows with type badge and ingredients
- [ ] Rows missing required fields show a destructive Alert; valid/invalid counters update
- [ ] Remove (×) button removes a row from the preview
- [ ] Submit inserts proposals as `status='proposed'` and clears the preview
- [ ] Submitting more than `config.chef_max_protein` or `chef_max_veg` returns the limit error toast and inserts nothing
- [ ] "Previously Submitted" lists proposals with Pending / Accepted / Declined badges that flip when family accepts/declines

---

## Sprint 5 — Configuration

- [ ] All config fields load from the database on `/family/settings` mount
- [ ] System prompt edits persist after Save and reload
- [ ] Allergy constraints save as multi-line plain text
- [ ] Each dietary rule toggle persists to `config.dietary_rules` JSON
- [ ] "Download Template" downloads a `taste-profile.md` file
- [ ] "Upload Profile" populates the textarea with the file's contents (editable)
- [ ] Chef proposal limits save and clamp to 1–5 server-side
- [ ] Family and chef email fields save
- [ ] Save button issues exactly one `PUT /api/config` containing all fields
- [ ] Saved config is consumed by the next AI generation (verify by adding a distinctive instruction to the system prompt and regenerating)

---

## Sprint 6 — Dish History + Polish

- [ ] `/family/history` stats row shows correct Total / 😍 Loved / 😐 OK / 👎 Disliked counts
- [ ] Search input filters the list by name (debounced)
- [ ] Rating filter ("All / Loved / OK / Disliked") narrows the list
- [ ] Type filter ("All / Proteins / Vegetables") narrows the list
- [ ] Filters that match nothing show "No dishes found matching your filters."
- [ ] Each result card shows emoji, name, rating emoji (if rated), type + tag badges, last-served date / "Not yet rated", "served N×" when N>0, italic family note (if any), Recipe link (if URL exists)
- [ ] CSV import: "Import CSV" picks a file, batch-imports rows, toast shows count, dishes appear after reload
- [ ] CSV import upserts on name (re-importing a row updates the existing dish, no duplicates); rows with `rating` create `dish_ratings` priming entries
- [ ] Family menu page: a generation failure shows a red Alert below the header with a Retry button (in addition to the toast)
- [ ] Family menu empty state shows the "Tip: rate dishes in Feedback to personalize future menus." line
- [ ] At 375px width (iPhone SE), every family page renders without horizontal scroll and the mobile bottom nav never overlaps the last card
- [ ] Full end-to-end loop works: login → generate → edit → publish → chef confirm → family rates → submit feedback → next week's generation prompt includes loved/disliked context (verify in `/api/generate` request payload or by logging the assembled prompt)
