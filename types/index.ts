export type UserRole = 'producer' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  preferred_language: 'en' | 'es' | 'hmn'
  role: UserRole
  created_at: string
  updated_at: string
}

export type BusinessStage = 'new' | 'existing' | 'unknown'
export type ProductionLocationType = 'home' | 'commercial_kitchen' | 'shared_kitchen' | 'farm' | 'other'
export type SellingGoal = 'farmers_markets' | 'community_events' | 'from_home' | 'online_delivery' | 'cafes' | 'retail' | 'not_sure'

export interface ProducerProfile {
  id: string
  user_id: string
  business_name?: string
  owner_name: string
  city: string
  state: string
  zip?: string
  business_stage: BusinessStage
  production_location_type: ProductionLocationType
  sells_now: boolean
  selling_goals: SellingGoal[]
  website_url?: string
  instagram_url?: string
  facebook_url?: string
  created_at: string
  updated_at: string
}

export type ProductCategory =
  | 'baked_goods'
  | 'sauce'
  | 'jam_jelly'
  | 'candy'
  | 'granola'
  | 'frozen_food'
  | 'beverage_coffee'
  | 'skincare_body_care'
  | 'soap'
  | 'other'

export interface Product {
  id: string
  producer_profile_id: string
  name: string
  category: ProductCategory
  is_food: boolean
  shelf_stable: boolean
  requires_refrigeration: boolean
  requires_freezing: boolean
  ingredients?: string
  allergens?: string[]
  packaging_type?: string
  price?: number
  production_volume?: string
  description?: string
  created_at: string
  updated_at: string
}

export type LabelStatus = 'missing_info' | 'draft' | 'ready_for_review' | 'complete'

export interface Label {
  id: string
  product_id: string
  business_name_or_registrant?: string
  registration_number_or_address?: string
  date_made?: string
  ingredients?: string
  allergens?: string[]
  required_statement?: string
  net_weight?: string
  contact_info?: string
  label_text?: string
  status: LabelStatus
  created_at: string
  updated_at: string
}

export type DocumentType =
  | 'cottage_food_registration'
  | 'food_safety_training'
  | 'insurance_certificate'
  | 'business_registration'
  | 'label'
  | 'product_photo'
  | 'booth_photo'
  | 'menu'
  | 'application_pdf'
  | 'other'

export type DocumentStatus = 'active' | 'expired' | 'missing' | 'needs_review'

export interface Document {
  id: string
  producer_profile_id: string
  product_id?: string
  market_id?: string
  document_type: DocumentType
  file_url?: string
  file_name: string
  status: DocumentStatus
  issued_date?: string
  expiration_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export type ChecklistCategory =
  | 'compliance'
  | 'labels'
  | 'insurance'
  | 'market_applications'
  | 'business_setup'
  | 'product_prep'

export type ChecklistStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked' | 'not_applicable'
export type ChecklistPriority = 'high' | 'medium' | 'low'

export interface ChecklistItem {
  id: string
  producer_profile_id: string
  product_id?: string
  market_id?: string
  category: ChecklistCategory
  title: string
  description: string
  reason: string
  status: ChecklistStatus
  priority: ChecklistPriority
  due_date?: string
  external_url?: string
  required_document_type?: DocumentType
  created_at: string
  updated_at: string
}

export interface Market {
  id: string
  name: string
  city: string
  state: string
  address?: string
  website_url?: string
  application_url?: string
  contact_email?: string
  application_open_date?: string
  application_close_date?: string
  season_start_date?: string
  season_end_date?: string
  categories_accepted?: ProductCategory[]
  requirements?: string
  insurance_required: boolean
  license_required: boolean
  producer_only: boolean
  fee_notes?: string
  notes?: string
  last_verified?: string
  created_at: string
  updated_at: string
}

export type SavedMarketStatus =
  | 'interested'
  | 'missing_requirements'
  | 'ready_to_apply'
  | 'applied'
  | 'waitlisted'
  | 'accepted'
  | 'rejected'
  | 'closed'

export interface SavedMarket {
  id: string
  producer_profile_id: string
  market_id: string
  market?: Market
  status: SavedMarketStatus
  notes?: string
  created_at: string
  updated_at: string
}

export type ApplicationPacketStatus = 'draft' | 'ready_for_review' | 'exported'

export interface ApplicationPacket {
  id: string
  producer_profile_id: string
  market_id?: string
  vendor_bio?: string
  business_description?: string
  product_descriptions?: string
  booth_description?: string
  generated_answers?: Record<string, string>
  status: ApplicationPacketStatus
  created_at: string
  updated_at: string
}

export interface ReadinessScore {
  overall: number
  business_profile: number
  product_profile: number
  compliance: number
  labels: number
  insurance_documents: number
  market_applications: number
}

export interface OnboardingData {
  step: number
  business: Partial<ProducerProfile>
  products: Partial<Product>[]
  status: {
    has_cottage_food_registration: boolean
    has_food_safety_training: boolean
    has_business_registration: boolean
    has_insurance: boolean
    has_product_labels: boolean
    has_ingredient_list: boolean
    has_product_photos: boolean
    has_menu_sheet: boolean
    has_market_applications: boolean
    existing_markets: string[]
    website_url?: string
    social_links?: string[]
  }
}
