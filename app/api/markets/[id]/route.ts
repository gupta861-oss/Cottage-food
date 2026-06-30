import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getMarket, updateMarket, deleteMarket } from '@/lib/store'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const market = await getMarket(params.id)
  if (!market) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ market })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const data = await req.json()
  const market = await updateMarket(params.id, data)
  if (!market) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ market })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const deleted = await deleteMarket(params.id)
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
