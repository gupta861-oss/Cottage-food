import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, getProducts, getDocuments, getChecklist } from '@/lib/store'
import { calculateReadinessScore } from '@/lib/rules-engine'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ score: null })

  const [products, documents, checklistItems] = await Promise.all([
    getProducts(profile.id),
    getDocuments(profile.id),
    getChecklist(profile.id),
  ])

  const score = calculateReadinessScore(profile, products, documents, checklistItems)
  return NextResponse.json({ score })
}
