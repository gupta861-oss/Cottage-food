import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getMarkets, createMarket } from '@/lib/store'

export async function GET(req: NextRequest) {
  const markets = await getMarkets()
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state')
  const city = searchParams.get('city')

  let filtered = markets
  if (state) filtered = filtered.filter(m => m.state === state)
  if (city) filtered = filtered.filter(m => m.city.toLowerCase().includes(city.toLowerCase()))

  return NextResponse.json({ markets: filtered })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const data = await req.json()
  const market = await createMarket(data)
  return NextResponse.json({ market }, { status: 201 })
}
