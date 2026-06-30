import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateShort(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function isExpiringSoon(dateString?: string, daysThreshold = 30): boolean {
  if (!dateString) return false
  const expDate = new Date(dateString)
  const now = new Date()
  const diffMs = expDate.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > 0 && diffDays <= daysThreshold
}

export function isExpired(dateString?: string): boolean {
  if (!dateString) return false
  return new Date(dateString) < new Date()
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
}

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  baked_goods: 'Baked Goods',
  sauce: 'Sauce',
  jam_jelly: 'Jam / Jelly',
  candy: 'Candy',
  granola: 'Granola',
  frozen_food: 'Frozen Food',
  beverage_coffee: 'Beverage / Coffee',
  skincare_body_care: 'Skincare / Body Care',
  soap: 'Soap',
  other: 'Other',
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  cottage_food_registration: 'Cottage Food Registration',
  food_safety_training: 'Food Safety Training Certificate',
  insurance_certificate: 'Insurance Certificate',
  business_registration: 'Business Registration / DBA',
  label: 'Product Label',
  product_photo: 'Product Photo',
  booth_photo: 'Booth Photo',
  menu: 'Menu / Product Sheet',
  application_pdf: 'Market Application PDF',
  other: 'Other Document',
}

export const SELLING_GOAL_LABELS: Record<string, string> = {
  farmers_markets: "Farmers Markets",
  community_events: "Community Events",
  from_home: "From Home",
  online_delivery: "Online / Local Delivery",
  cafes: "Cafes",
  retail: "Retail Stores",
  not_sure: "Not Sure Yet",
}

export const PRODUCTION_LOCATION_LABELS: Record<string, string> = {
  home: 'Home Kitchen',
  commercial_kitchen: 'Commercial Kitchen',
  shared_kitchen: 'Shared Kitchen',
  farm: 'Farm',
  other: 'Other',
}

export const CHECKLIST_CATEGORY_LABELS: Record<string, string> = {
  compliance: 'Compliance',
  labels: 'Labels',
  insurance: 'Insurance',
  market_applications: 'Market Applications',
  business_setup: 'Business Setup',
  product_prep: 'Product Preparation',
}

export const STATUS_COLORS: Record<string, string> = {
  not_started: 'text-gray-500 bg-gray-50',
  in_progress: 'text-blue-700 bg-blue-50',
  complete: 'text-green-700 bg-green-50',
  blocked: 'text-red-700 bg-red-50',
  not_applicable: 'text-gray-400 bg-gray-50',
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-700 bg-red-50',
  medium: 'text-yellow-700 bg-yellow-50',
  low: 'text-blue-700 bg-blue-50',
}
