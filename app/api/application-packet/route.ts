import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, getApplicationPacket, upsertApplicationPacket, getProducts } from '@/lib/store'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ packet: null })

  const packet = await getApplicationPacket(profile.id)
  return NextResponse.json({ packet })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ error: 'No producer profile' }, { status: 400 })

  const products = await getProducts(profile.id)

  // Auto-generate initial content from profile data
  const vendorBio = `${profile.business_name ?? profile.owner_name} is a ${profile.business_stage === 'new' ? 'new' : 'local'} producer based in ${profile.city}, ${profile.state}. We specialize in ${products.map(p => p.name).join(', ') || 'handcrafted food products'} made with care ${profile.production_location_type === 'home' ? 'in our home kitchen' : `in a ${profile.production_location_type.replace(/_/g, ' ')}`}.`

  const productDescriptions = products.map(p =>
    `${p.name}: ${p.description ?? `Handcrafted ${p.category.replace(/_/g, ' ')} made locally in ${profile.city}, ${profile.state}.`}`
  ).join('\n\n')

  const boothDescription = `Our booth features a clean, welcoming display of our products. We focus on making it easy for customers to browse and ask questions about our ${products.length > 0 ? products[0].category.replace(/_/g, ' ') : 'products'}.`

  const data = await req.json().catch(() => ({}))

  const packet = await upsertApplicationPacket({
    producer_profile_id: profile.id,
    vendor_bio: data.vendor_bio ?? vendorBio,
    business_description: data.business_description ?? `${profile.business_name ?? profile.owner_name} is a cottage food producer in ${profile.city}, ${profile.state}.`,
    product_descriptions: data.product_descriptions ?? productDescriptions,
    booth_description: data.booth_description ?? boothDescription,
    status: 'draft',
    ...data,
  })

  return NextResponse.json({ packet }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ error: 'No producer profile' }, { status: 400 })

  const data = await req.json()
  const packet = await upsertApplicationPacket({ ...data, producer_profile_id: profile.id })
  return NextResponse.json({ packet })
}
