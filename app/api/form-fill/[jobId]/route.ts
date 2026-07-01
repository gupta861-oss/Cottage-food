import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getFormFillJob, updateFormFillJob } from '@/lib/store'

const TERMINAL_STATUSES = new Set(['completed', 'error', 'captcha_required', 'payment_required'])
const STALE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = getFormFillJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.user_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Auto-expire stale jobs
  if (!TERMINAL_STATUSES.has(job.status)) {
    const age = Date.now() - new Date(job.created_at).getTime()
    if (age > STALE_TIMEOUT_MS) {
      const updated = updateFormFillJob(job.id, {
        status: 'error',
        error_message: 'Session timed out — the browser session expired. Please try again.',
      })
      return NextResponse.json({ job: updated })
    }
  }

  // Don't send screenshot_path to client — screenshot is served via the /screenshot route
  const { screenshot_path: _sp, ...safeJob } = job
  return NextResponse.json({ job: safeJob })
}

export async function DELETE(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = getFormFillJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.user_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = updateFormFillJob(job.id, {
    status: 'error',
    error_message: 'Cancelled by user.',
  })
  return NextResponse.json({ job: updated })
}
