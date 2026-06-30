import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, getSavedMarkets, saveMarket } from '@/lib/store'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ savedMarkets: [] })

  const savedMarkets = await getSavedMarkets(profile.id)
  return NextResponse.json({ savedMarkets })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ error: 'No producer profile' }, { status: 400 })

  const data = await req.json()
  const savedMarket = await saveMarket({ ...data, producer_profile_id: profile.id })
  return NextResponse.json({ savedMarket }, { status: 201 })
}
