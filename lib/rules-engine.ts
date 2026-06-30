import { ProducerProfile, Product, Document, ChecklistItem, Market, SavedMarket } from '@/types'
import { generateId } from './utils'

interface RulesInput {
  profile: ProducerProfile
  products: Product[]
  documents: Document[]
  savedMarkets: SavedMarket[]
}

export function generateChecklist(input: RulesInput): Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>[] {
  const { profile, products, documents, savedMarkets } = input
  const items: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>[] = []
  const now = new Date().toISOString()

  const hasDoc = (type: string) => documents.some(d => d.document_type === type && d.status === 'active')
  const isMN = profile.state === 'MN'
  const isFarmersMarket = profile.selling_goals.includes('farmers_markets')
  const hasFood = products.some(p => p.is_food)
  const hasBakedGoods = products.some(p => p.category === 'baked_goods')
  const hasAllergens = products.some(p => p.allergens && p.allergens.length > 0)
  const isHomeKitchen = profile.production_location_type === 'home'

  // Business setup
  if (!profile.business_name) {
    items.push({
      producer_profile_id: profile.id,
      category: 'business_setup',
      title: 'Add your business name',
      description: 'Give your cottage food business a name.',
      reason: 'A business name helps build your brand and is required on labels and market applications.',
      status: 'not_started',
      priority: 'high',
      external_url: undefined,
      required_document_type: undefined,
    })
  }

  // Cottage food registration
  if (hasFood && isHomeKitchen) {
    const hasCFReg = hasDoc('cottage_food_registration')
    items.push({
      producer_profile_id: profile.id,
      category: 'compliance',
      title: isMN ? 'Register as a Minnesota Cottage Food Producer' : 'Register as a Cottage Food Producer',
      description: isMN
        ? 'File your cottage food registration with the Minnesota Department of Agriculture.'
        : 'Register as a cottage food producer in your state.',
      reason: 'Cottage food registration is legally required to sell food made in your home kitchen.',
      status: hasCFReg ? 'complete' : 'not_started',
      priority: 'high',
      external_url: isMN ? 'https://www.mda.state.mn.us/food-feed/cottage-food' : undefined,
      required_document_type: 'cottage_food_registration',
    })
  }

  // Food safety training
  if (hasFood) {
    const hasTraining = hasDoc('food_safety_training')
    items.push({
      producer_profile_id: profile.id,
      category: 'compliance',
      title: 'Complete Food Safety Training',
      description: isMN
        ? 'Complete a food safety training course approved by the Minnesota Department of Agriculture.'
        : 'Complete a recognized food safety training course.',
      reason: 'Food safety training is required for cottage food producers and demonstrates safe food handling practices to markets.',
      status: hasTraining ? 'complete' : 'not_started',
      priority: 'high',
      external_url: isMN ? 'https://www.mda.state.mn.us/food-feed/cottage-food/food-safety-training' : undefined,
      required_document_type: 'food_safety_training',
    })
  }

  // Business registration
  const hasBizReg = hasDoc('business_registration')
  items.push({
    producer_profile_id: profile.id,
    category: 'business_setup',
    title: 'Register Your Business Name (DBA)',
    description: 'File a DBA (Doing Business As) or business registration if selling under a business name.',
    reason: 'Required to legally operate under a business name, open a business bank account, and receive payments.',
    status: hasBizReg ? 'complete' : 'not_started',
    priority: 'medium',
    external_url: undefined,
    required_document_type: 'business_registration',
  })

  // Product labels
  if (hasFood) {
    const hasLabel = documents.some(d => d.document_type === 'label' && d.status === 'active')
    items.push({
      producer_profile_id: profile.id,
      category: 'labels',
      title: 'Create Required Product Labels',
      description: 'Create compliant labels for your food products including product name, ingredients, allergens, and required cottage food statement.',
      reason: 'Proper labeling is legally required for food products sold to the public and inspected at farmers markets.',
      status: hasLabel ? 'complete' : 'not_started',
      priority: 'high',
      external_url: undefined,
      required_document_type: 'label',
    })
  }

  // Allergen labeling
  if (hasAllergens) {
    items.push({
      producer_profile_id: profile.id,
      category: 'labels',
      title: 'Include Allergen Information on Labels',
      description: 'Clearly list all major allergens on your product labels (peanuts, tree nuts, milk, eggs, wheat, soy, fish, shellfish, sesame).',
      reason: 'Allergen labeling is required by law and critical for customer safety. Missing allergen info is a common market rejection reason.',
      status: 'not_started',
      priority: 'high',
      external_url: 'https://www.fda.gov/food/food-allergens',
    })
  }

  // Insurance
  if (isFarmersMarket) {
    const hasInsurance = hasDoc('insurance_certificate')
    const marketsRequiringInsurance = savedMarkets.filter(sm => {
      return true // all markets may require it
    })
    items.push({
      producer_profile_id: profile.id,
      category: 'insurance',
      title: 'Obtain Vendor / Product Liability Insurance',
      description: "Get a Certificate of Insurance (COI) naming your business. Many farmers markets require $1M general liability coverage.",
      reason: 'Most farmers markets require proof of insurance before you can sell. It also protects you from claims.',
      status: hasInsurance ? 'complete' : 'not_started',
      priority: 'high',
      required_document_type: 'insurance_certificate',
    })
  }

  // Product photos
  const hasPhotos = hasDoc('product_photo')
  items.push({
    producer_profile_id: profile.id,
    category: 'product_prep',
    title: 'Take Professional Product Photos',
    description: 'Take clear, well-lit photos of your products. Markets and customers want to see what you sell.',
    reason: 'Product photos are required for most farmers market applications and help attract customers.',
    status: hasPhotos ? 'complete' : 'not_started',
    priority: 'medium',
    required_document_type: 'product_photo',
  })

  // Vendor bio / application packet
  if (isFarmersMarket) {
    items.push({
      producer_profile_id: profile.id,
      category: 'market_applications',
      title: 'Prepare Your Vendor Bio & Application Packet',
      description: 'Write a vendor bio, product descriptions, and booth description that you can reuse across market applications.',
      reason: 'Market applications ask for similar information. Having a prepared packet saves time and makes stronger applications.',
      status: 'not_started',
      priority: 'medium',
    })

    // Find markets with open applications
    const openMarkets = savedMarkets.filter(sm => {
      // would check application dates here
      return sm.status === 'interested' || sm.status === 'ready_to_apply'
    })

    if (openMarkets.length > 0) {
      items.push({
        producer_profile_id: profile.id,
        category: 'market_applications',
        title: 'Submit Farmers Market Applications',
        description: 'You have saved markets with open applications. Review requirements and submit before deadlines.',
        reason: 'Markets fill spots quickly. Early applications have better acceptance rates.',
        status: 'not_started',
        priority: 'high',
      })
    } else {
      items.push({
        producer_profile_id: profile.id,
        category: 'market_applications',
        title: 'Research and Save Farmers Markets to Apply To',
        description: 'Browse the market directory and save markets that match your products and location.',
        reason: 'Finding the right markets early lets you plan around application windows and deadlines.',
        status: 'not_started',
        priority: 'medium',
      })
    }
  }

  // Booth photo
  const hasBooth = hasDoc('booth_photo')
  if (isFarmersMarket && profile.sells_now) {
    items.push({
      producer_profile_id: profile.id,
      category: 'market_applications',
      title: 'Upload a Booth / Display Photo',
      description: 'Add a photo of your market booth setup. Many market applications request this.',
      reason: 'Markets want to see how you present your products. A professional booth photo strengthens applications.',
      status: hasBooth ? 'complete' : 'not_started',
      priority: 'low',
      required_document_type: 'booth_photo',
    })
  }

  return items
}

export function calculateReadinessScore(
  profile: ProducerProfile | null,
  products: Product[],
  documents: Document[],
  checklistItems: ChecklistItem[]
): Record<string, number> {
  if (!profile) {
    return {
      overall: 0,
      business_profile: 0,
      product_profile: 0,
      compliance: 0,
      labels: 0,
      insurance_documents: 0,
      market_applications: 0,
    }
  }

  // Business profile score
  const profileFields = ['business_name', 'owner_name', 'city', 'state', 'production_location_type', 'selling_goals']
  const filledFields = profileFields.filter(f => {
    const val = (profile as any)[f]
    return val && (Array.isArray(val) ? val.length > 0 : true)
  })
  const business_profile = Math.round((filledFields.length / profileFields.length) * 100)

  // Product profile score
  const product_profile = products.length > 0
    ? Math.min(100, products.length * 25 + (products.some(p => p.ingredients) ? 25 : 0) + (products.some(p => p.allergens) ? 25 : 0))
    : 0

  // Compliance score
  const complianceItems = checklistItems.filter(i => i.category === 'compliance')
  const compliance = complianceItems.length > 0
    ? Math.round((complianceItems.filter(i => i.status === 'complete').length / complianceItems.length) * 100)
    : 100

  // Labels score
  const labelItems = checklistItems.filter(i => i.category === 'labels')
  const labels = labelItems.length > 0
    ? Math.round((labelItems.filter(i => i.status === 'complete').length / labelItems.length) * 100)
    : 100

  // Insurance/documents
  const insuranceDocs = documents.filter(d => d.document_type === 'insurance_certificate' && d.status === 'active')
  const insurance_documents = documents.length > 0
    ? Math.round((documents.filter(d => d.status === 'active').length / Math.max(documents.length, 3)) * 100)
    : 0

  // Market applications
  const marketItems = checklistItems.filter(i => i.category === 'market_applications')
  const market_applications = marketItems.length > 0
    ? Math.round((marketItems.filter(i => i.status === 'complete' || i.status === 'in_progress').length / marketItems.length) * 100)
    : 0

  const overall = Math.round(
    (business_profile * 0.2 + product_profile * 0.2 + compliance * 0.25 + labels * 0.15 + insurance_documents * 0.1 + market_applications * 0.1)
  )

  return { overall, business_profile, product_profile, compliance, labels, insurance_documents, market_applications }
}

export function updateSavedMarketStatuses(
  savedMarkets: SavedMarket[],
  markets: Market[],
  documents: Document[]
): SavedMarket[] {
  const now = new Date()
  const hasInsurance = documents.some(d => d.document_type === 'insurance_certificate' && d.status === 'active')
  const hasCFReg = documents.some(d => d.document_type === 'cottage_food_registration' && d.status === 'active')

  return savedMarkets.map(sm => {
    const market = markets.find(m => m.id === sm.market_id)
    if (!market) return sm

    // Don't override manually set statuses like applied, accepted, etc.
    if (['applied', 'accepted', 'rejected', 'waitlisted'].includes(sm.status)) return sm

    const appClose = market.application_close_date ? new Date(market.application_close_date) : null
    if (appClose && appClose < now) {
      return { ...sm, status: 'closed' as const }
    }

    const missingInsurance = market.insurance_required && !hasInsurance
    const missingLicense = market.license_required && !hasCFReg

    if (missingInsurance || missingLicense) {
      return { ...sm, status: 'missing_requirements' as const }
    }

    return { ...sm, status: 'ready_to_apply' as const }
  })
}
