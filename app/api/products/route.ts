import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, getProducts, createProduct } from '@/lib/store'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ products: [] })

  const products = await getProducts(profile.id)
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ error: 'No producer profile' }, { status: 400 })

  const data = await req.json()
  const product = await createProduct({ ...data, producer_profile_id: profile.id })
  return NextResponse.json({ product }, { status: 201 })
}
