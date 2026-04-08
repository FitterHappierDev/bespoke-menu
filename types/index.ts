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
  tags: string[]
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
  summary: { loved: number; ok: number; disliked: number; notes: string[] }
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

export interface GeneratedDish {
  name: string
  emoji: string
  recipe_url: string
  tags: string[]
  ingredients: string[]
  description: string
  is_new: boolean
}

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
