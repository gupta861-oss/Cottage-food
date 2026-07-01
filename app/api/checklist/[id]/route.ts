import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getProducerProfile, getChecklist, updateChecklistItem } from '@/lib/store'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  const owned = profile ? await getChecklist(profile.id) : []
  if (!owned.some(i => i.id === params.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json()
  const item = await updateChecklistItem(params.id, data)
  return NextResponse.json({ item })
}
