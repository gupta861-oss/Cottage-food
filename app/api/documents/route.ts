import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, getDocuments, createDocument } from '@/lib/store'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ documents: [] })

  const documents = await getDocuments(profile.id)
  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ error: 'No producer profile' }, { status: 400 })

  const data = await req.json()
  const doc = await createDocument({ ...data, producer_profile_id: profile.id })
  return NextResponse.json({ document: doc }, { status: 201 })
}
