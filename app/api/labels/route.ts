import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, getProduct, getLabel, upsertLabel } from '@/lib/store'

async function ownsProduct(userId: string, productId: string | undefined): Promise<boolean> {
  if (!productId) return false
  const profile = await getProducerProfile(userId)
  if (!profile) return false
  const product = await getProduct(productId)
  return !!product && product.producer_profile_id === profile.id
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await ownsProduct(session.user.id, productId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const label = await getLabel(productId)
  return NextResponse.json({ label })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  if (!(await ownsProduct(session.user.id, data.product_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const label = await upsertLabel(data)
  return NextResponse.json({ label }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  if (!(await ownsProduct(session.user.id, data.product_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const label = await upsertLabel(data)
  return NextResponse.json({ label })
}
