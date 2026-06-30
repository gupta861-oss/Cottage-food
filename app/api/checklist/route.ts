import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import {
  getProducerProfile, getProducts, getDocuments, getSavedMarkets,
  getChecklist, deleteChecklistForProfile, bulkCreateChecklist
} from '@/lib/store'
import { generateChecklist } from '@/lib/rules-engine'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ items: [] })

  const items = await getChecklist(profile.id)
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ error: 'No producer profile' }, { status: 400 })

  const [products, documents, savedMarkets] = await Promise.all([
    getProducts(profile.id),
    getDocuments(profile.id),
    getSavedMarkets(profile.id),
  ])

  await deleteChecklistForProfile(profile.id)
  const generatedItems = generateChecklist({ profile, products, documents, savedMarkets })
  const items = await bulkCreateChecklist(generatedItems)

  return NextResponse.json({ items }, { status: 201 })
}
