import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, createProducerProfile, updateProducerProfile } from '@/lib/store'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const profile = await createProducerProfile({ ...data, user_id: session.user.id })
  return NextResponse.json({ profile }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await getProducerProfile(session.user.id)
  if (!existing) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const data = await req.json()
  const profile = await updateProducerProfile(existing.id, data)
  return NextResponse.json({ profile })
}
