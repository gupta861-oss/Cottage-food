import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, getSavedMarkets, updateSavedMarket, removeSavedMarket } from '@/lib/store'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  const owned = profile ? await getSavedMarkets(profile.id) : []
  if (!owned.some(s => s.id === params.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json()
  const savedMarket = await updateSavedMarket(params.id, data)
  return NextResponse.json({ savedMarket })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  const owned = profile ? await getSavedMarkets(profile.id) : []
  if (!owned.some(s => s.id === params.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const deleted = await removeSavedMarket(params.id)
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
