import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, updateProduct, deleteProduct, getProduct } from '@/lib/store'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  const existing = await getProduct(params.id)
  if (!existing || !profile || existing.producer_profile_id !== profile.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json()
  const product = await updateProduct(params.id, data)
  return NextResponse.json({ product })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  const existing = await getProduct(params.id)
  if (!existing || !profile || existing.producer_profile_id !== profile.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const deleted = await deleteProduct(params.id)
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
