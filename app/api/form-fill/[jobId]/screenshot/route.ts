import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getFormFillJob } from '@/lib/store'
import fs from 'fs'

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = getFormFillJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.user_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!job.screenshot_path || !fs.existsSync(job.screenshot_path)) {
    return NextResponse.json({ error: 'Screenshot not available yet' }, { status: 404 })
  }

  const buffer = fs.readFileSync(job.screenshot_path)
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  })
}
