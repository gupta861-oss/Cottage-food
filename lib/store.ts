import { User, ProducerProfile, Product, Label, Document, ChecklistItem, Market, SavedMarket, ApplicationPacket, FormFillJob } from '@/types'
import { generateId } from './utils'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), '.data')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readFile<T>(filename: string, defaultValue: T): T {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
    }
  } catch {}
  return defaultValue
}

function writeFile<T>(filename: string, data: T): void {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function createUser(email: string, name: string, password: string): Promise<User> {
  const users = readFile<User[]>('users.json', [])
  if (users.find(u => u.email === email)) {
    throw new Error('Email already in use')
  }
  const hashed = await bcrypt.hash(password, 10)
  const user: User = {
    id: generateId(),
    email,
    name,
    preferred_language: 'en',
    role: 'producer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  // store password separately
  const passwords = readFile<Record<string, string>>('passwords.json', {})
  passwords[user.id] = hashed
  writeFile('passwords.json', passwords)
  users.push(user)
  writeFile('users.json', users)
  return user
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = readFile<User[]>('users.json', [])
  return users.find(u => u.email === email) ?? null
}

export async function findUserById(id: string): Promise<User | null> {
  const users = readFile<User[]>('users.json', [])
  return users.find(u => u.id === id) ?? null
}

export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const passwords = readFile<Record<string, string>>('passwords.json', {})
  const hashed = passwords[userId]
  if (!hashed) return false
  return bcrypt.compare(password, hashed)
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const users = readFile<User[]>('users.json', [])
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return null
  users[idx] = { ...users[idx], ...data, updated_at: new Date().toISOString() }
  writeFile('users.json', users)
  return users[idx]
}

// ─── Producer Profile ──────────────────────────────────────────────────────────

export async function getProducerProfile(userId: string): Promise<ProducerProfile | null> {
  const profiles = readFile<ProducerProfile[]>('producer-profiles.json', [])
  return profiles.find(p => p.user_id === userId) ?? null
}

export async function createProducerProfile(data: Omit<ProducerProfile, 'id' | 'created_at' | 'updated_at'>): Promise<ProducerProfile> {
  const profiles = readFile<ProducerProfile[]>('producer-profiles.json', [])
  const profile: ProducerProfile = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  profiles.push(profile)
  writeFile('producer-profiles.json', profiles)
  return profile
}

export async function updateProducerProfile(id: string, data: Partial<ProducerProfile>): Promise<ProducerProfile | null> {
  const profiles = readFile<ProducerProfile[]>('producer-profiles.json', [])
  const idx = profiles.findIndex(p => p.id === id)
  if (idx === -1) return null
  profiles[idx] = { ...profiles[idx], ...data, updated_at: new Date().toISOString() }
  writeFile('producer-profiles.json', profiles)
  return profiles[idx]
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(producerProfileId: string): Promise<Product[]> {
  const products = readFile<Product[]>('products.json', [])
  return products.filter(p => p.producer_profile_id === producerProfileId)
}

export async function getProduct(id: string): Promise<Product | null> {
  const products = readFile<Product[]>('products.json', [])
  return products.find(p => p.id === id) ?? null
}

export async function createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
  const products = readFile<Product[]>('products.json', [])
  const product: Product = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  products.push(product)
  writeFile('products.json', products)
  return product
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product | null> {
  const products = readFile<Product[]>('products.json', [])
  const idx = products.findIndex(p => p.id === id)
  if (idx === -1) return null
  products[idx] = { ...products[idx], ...data, updated_at: new Date().toISOString() }
  writeFile('products.json', products)
  return products[idx]
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = readFile<Product[]>('products.json', [])
  const filtered = products.filter(p => p.id !== id)
  if (filtered.length === products.length) return false
  writeFile('products.json', filtered)
  return true
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function getLabel(productId: string): Promise<Label | null> {
  const labels = readFile<Label[]>('labels.json', [])
  return labels.find(l => l.product_id === productId) ?? null
}

export async function upsertLabel(data: Omit<Label, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Label> {
  const labels = readFile<Label[]>('labels.json', [])
  const existing = labels.findIndex(l => l.product_id === data.product_id)
  if (existing !== -1) {
    labels[existing] = { ...labels[existing], ...data, updated_at: new Date().toISOString() }
    writeFile('labels.json', labels)
    return labels[existing]
  }
  const label: Label = {
    ...data,
    id: data.id ?? generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  labels.push(label)
  writeFile('labels.json', labels)
  return label
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function getDocuments(producerProfileId: string): Promise<Document[]> {
  const docs = readFile<Document[]>('documents.json', [])
  return docs.filter(d => d.producer_profile_id === producerProfileId)
}

export async function createDocument(data: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
  const docs = readFile<Document[]>('documents.json', [])
  const doc: Document = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  docs.push(doc)
  writeFile('documents.json', docs)
  return doc
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<Document | null> {
  const docs = readFile<Document[]>('documents.json', [])
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return null
  docs[idx] = { ...docs[idx], ...data, updated_at: new Date().toISOString() }
  writeFile('documents.json', docs)
  return docs[idx]
}

export async function deleteDocument(id: string): Promise<boolean> {
  const docs = readFile<Document[]>('documents.json', [])
  const filtered = docs.filter(d => d.id !== id)
  if (filtered.length === docs.length) return false
  writeFile('documents.json', filtered)
  return true
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export async function getChecklist(producerProfileId: string): Promise<ChecklistItem[]> {
  const items = readFile<ChecklistItem[]>('checklist.json', [])
  return items.filter(i => i.producer_profile_id === producerProfileId)
}

export async function createChecklistItem(data: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>): Promise<ChecklistItem> {
  const items = readFile<ChecklistItem[]>('checklist.json', [])
  const item: ChecklistItem = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  items.push(item)
  writeFile('checklist.json', items)
  return item
}

export async function updateChecklistItem(id: string, data: Partial<ChecklistItem>): Promise<ChecklistItem | null> {
  const items = readFile<ChecklistItem[]>('checklist.json', [])
  const idx = items.findIndex(i => i.id === id)
  if (idx === -1) return null
  items[idx] = { ...items[idx], ...data, updated_at: new Date().toISOString() }
  writeFile('checklist.json', items)
  return items[idx]
}

export async function bulkCreateChecklist(items: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<ChecklistItem[]> {
  const existing = readFile<ChecklistItem[]>('checklist.json', [])
  const created: ChecklistItem[] = items.map(item => ({
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
  writeFile('checklist.json', [...existing, ...created])
  return created
}

export async function deleteChecklistForProfile(producerProfileId: string): Promise<void> {
  const items = readFile<ChecklistItem[]>('checklist.json', [])
  const filtered = items.filter(i => i.producer_profile_id !== producerProfileId)
  writeFile('checklist.json', filtered)
}

// ─── Markets ──────────────────────────────────────────────────────────────────

export async function getMarkets(): Promise<Market[]> {
  const markets = readFile<Market[]>('markets.json', SEED_MARKETS)
  if (markets.length === 0) {
    writeFile('markets.json', SEED_MARKETS)
    return SEED_MARKETS
  }
  return markets
}

export async function getMarket(id: string): Promise<Market | null> {
  const markets = await getMarkets()
  return markets.find(m => m.id === id) ?? null
}

export async function createMarket(data: Omit<Market, 'id' | 'created_at' | 'updated_at'>): Promise<Market> {
  const markets = await getMarkets()
  const market: Market = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  markets.push(market)
  writeFile('markets.json', markets)
  return market
}

export async function updateMarket(id: string, data: Partial<Market>): Promise<Market | null> {
  const markets = await getMarkets()
  const idx = markets.findIndex(m => m.id === id)
  if (idx === -1) return null
  markets[idx] = { ...markets[idx], ...data, updated_at: new Date().toISOString() }
  writeFile('markets.json', markets)
  return markets[idx]
}

export async function deleteMarket(id: string): Promise<boolean> {
  const markets = await getMarkets()
  const filtered = markets.filter(m => m.id !== id)
  if (filtered.length === markets.length) return false
  writeFile('markets.json', filtered)
  return true
}

// ─── Saved Markets ────────────────────────────────────────────────────────────

export async function getSavedMarkets(producerProfileId: string): Promise<SavedMarket[]> {
  const saved = readFile<SavedMarket[]>('saved-markets.json', [])
  const markets = await getMarkets()
  return saved
    .filter(s => s.producer_profile_id === producerProfileId)
    .map(s => ({ ...s, market: markets.find(m => m.id === s.market_id) }))
}

export async function saveMarket(data: Omit<SavedMarket, 'id' | 'created_at' | 'updated_at'>): Promise<SavedMarket> {
  const saved = readFile<SavedMarket[]>('saved-markets.json', [])
  const existing = saved.findIndex(s => s.producer_profile_id === data.producer_profile_id && s.market_id === data.market_id)
  if (existing !== -1) {
    saved[existing] = { ...saved[existing], ...data, updated_at: new Date().toISOString() }
    writeFile('saved-markets.json', saved)
    return saved[existing]
  }
  const savedMarket: SavedMarket = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  saved.push(savedMarket)
  writeFile('saved-markets.json', saved)
  return savedMarket
}

export async function updateSavedMarket(id: string, data: Partial<SavedMarket>): Promise<SavedMarket | null> {
  const saved = readFile<SavedMarket[]>('saved-markets.json', [])
  const idx = saved.findIndex(s => s.id === id)
  if (idx === -1) return null
  saved[idx] = { ...saved[idx], ...data, updated_at: new Date().toISOString() }
  writeFile('saved-markets.json', saved)
  return saved[idx]
}

export async function removeSavedMarket(id: string): Promise<boolean> {
  const saved = readFile<SavedMarket[]>('saved-markets.json', [])
  const filtered = saved.filter(s => s.id !== id)
  if (filtered.length === saved.length) return false
  writeFile('saved-markets.json', filtered)
  return true
}

// ─── Application Packet ───────────────────────────────────────────────────────

export async function getApplicationPacket(producerProfileId: string): Promise<ApplicationPacket | null> {
  const packets = readFile<ApplicationPacket[]>('application-packets.json', [])
  return packets.find(p => p.producer_profile_id === producerProfileId) ?? null
}

export async function upsertApplicationPacket(data: Omit<ApplicationPacket, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<ApplicationPacket> {
  const packets = readFile<ApplicationPacket[]>('application-packets.json', [])
  const existing = packets.findIndex(p => p.producer_profile_id === data.producer_profile_id)
  if (existing !== -1) {
    packets[existing] = { ...packets[existing], ...data, updated_at: new Date().toISOString() }
    writeFile('application-packets.json', packets)
    return packets[existing]
  }
  const packet: ApplicationPacket = {
    ...data,
    id: data.id ?? generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  packets.push(packet)
  writeFile('application-packets.json', packets)
  return packet
}

// ─── Form-Fill Jobs ───────────────────────────────────────────────────────────

export function createFormFillJob(
  data: Omit<FormFillJob, 'id' | 'created_at' | 'updated_at'>
): FormFillJob {
  const jobs = readFile<FormFillJob[]>('form-fill-jobs.json', [])
  const job: FormFillJob = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  jobs.push(job)
  writeFile('form-fill-jobs.json', jobs)
  return job
}

export function getFormFillJob(jobId: string): FormFillJob | null {
  const jobs = readFile<FormFillJob[]>('form-fill-jobs.json', [])
  return jobs.find(j => j.id === jobId) ?? null
}

export function updateFormFillJob(jobId: string, updates: Partial<FormFillJob>): FormFillJob | null {
  const jobs = readFile<FormFillJob[]>('form-fill-jobs.json', [])
  const idx = jobs.findIndex(j => j.id === jobId)
  if (idx === -1) return null
  jobs[idx] = { ...jobs[idx], ...updates, updated_at: new Date().toISOString() }
  writeFile('form-fill-jobs.json', jobs)
  return jobs[idx]
}

export function getFormFillJobsForUser(userId: string): FormFillJob[] {
  const jobs = readFile<FormFillJob[]>('form-fill-jobs.json', [])
  return jobs.filter(j => j.user_id === userId)
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_MARKETS: Market[] = [
  {
    id: 'market-1',
    name: 'Minneapolis Farmers Market',
    city: 'Minneapolis',
    state: 'MN',
    address: '312 E Lyndale Ave N, Minneapolis, MN 55405',
    website_url: 'https://www.mplsfarmersmarket.com',
    application_url: 'https://www.mplsfarmersmarket.com/vendors',
    application_open_date: '2026-01-01',
    application_close_date: '2026-03-01',
    season_start_date: '2026-05-01',
    season_end_date: '2026-10-31',
    categories_accepted: ['baked_goods', 'jam_jelly', 'sauce', 'granola', 'other'],
    requirements: 'Must be Minnesota producer. Cottage food products allowed. Insurance required.',
    insurance_required: true,
    license_required: true,
    producer_only: true,
    fee_notes: '$30/day stall fee or $600 for full season',
    notes: 'One of the largest farmers markets in the Midwest. Open daily April–November.',
    last_verified: '2025-12-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'market-2',
    name: 'St. Paul Farmers Market',
    city: 'Saint Paul',
    state: 'MN',
    address: '290 E 5th St, Saint Paul, MN 55101',
    website_url: 'https://www.stpaulfarmersmarket.com',
    application_url: 'https://www.stpaulfarmersmarket.com/become-a-vendor',
    application_open_date: '2026-01-15',
    application_close_date: '2026-03-15',
    season_start_date: '2026-04-18',
    season_end_date: '2026-11-22',
    categories_accepted: ['baked_goods', 'jam_jelly', 'sauce', 'granola', 'candy', 'soap'],
    requirements: 'Must grow or make products yourself. Annual vendor fee required. Proof of cottage food registration or commercial kitchen required.',
    insurance_required: true,
    license_required: true,
    producer_only: true,
    fee_notes: '$400 annual fee or $30/day',
    notes: 'Downtown St. Paul location, Saturdays and Sundays. Very competitive application process.',
    last_verified: '2025-12-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'market-3',
    name: 'Midtown Farmers Market',
    city: 'Minneapolis',
    state: 'MN',
    address: '2225 E Lake St, Minneapolis, MN 55407',
    website_url: 'https://www.midtownfarmersmarket.org',
    application_url: 'https://www.midtownfarmersmarket.org/vendors',
    application_open_date: '2026-02-01',
    application_close_date: '2026-04-01',
    season_start_date: '2026-05-09',
    season_end_date: '2026-10-10',
    categories_accepted: ['baked_goods', 'jam_jelly', 'sauce', 'granola', 'skincare_body_care', 'soap'],
    requirements: 'Focus on local, sustainable producers. Cottage food OK with registration.',
    insurance_required: false,
    license_required: true,
    producer_only: false,
    fee_notes: '$25/day or $450 seasonal',
    notes: 'Community-focused neighborhood market. Saturdays only. Strong focus on diversity and inclusion.',
    last_verified: '2025-12-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'market-4',
    name: 'Kingfield Neighborhood Farmers Market',
    city: 'Minneapolis',
    state: 'MN',
    address: '4310 Nicollet Ave, Minneapolis, MN 55409',
    website_url: 'https://www.kingfieldfarmersmarket.com',
    application_url: 'https://www.kingfieldfarmersmarket.com/apply',
    application_open_date: '2026-02-15',
    application_close_date: '2026-04-15',
    season_start_date: '2026-05-16',
    season_end_date: '2026-10-03',
    categories_accepted: ['baked_goods', 'jam_jelly', 'sauce', 'granola', 'candy', 'soap', 'skincare_body_care'],
    requirements: 'Must be local producer from Minnesota or Wisconsin. Registration required.',
    insurance_required: false,
    license_required: true,
    producer_only: false,
    fee_notes: '$20/day or $350 seasonal',
    notes: 'Small neighborhood market, community-focused. Good for new vendors.',
    last_verified: '2025-12-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'market-5',
    name: 'Northeast Minneapolis Farmers Market',
    city: 'Minneapolis',
    state: 'MN',
    address: '2200 18th Ave NE, Minneapolis, MN 55418',
    website_url: 'https://www.nemfm.com',
    application_url: 'https://www.nemfm.com/vendors',
    application_open_date: '2026-03-01',
    application_close_date: '2026-05-01',
    season_start_date: '2026-06-06',
    season_end_date: '2026-09-26',
    categories_accepted: ['baked_goods', 'sauce', 'jam_jelly', 'granola', 'beverage_coffee'],
    requirements: 'Northeast Minnesota/Wisconsin producers preferred.',
    insurance_required: true,
    license_required: true,
    producer_only: false,
    fee_notes: '$25/day',
    notes: 'Saturday market in Northeast Arts District. Applications open in spring.',
    last_verified: '2025-12-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
