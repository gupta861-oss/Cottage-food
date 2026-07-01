import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getFormFillJob, updateFormFillJob, updateSavedMarket } from '@/lib/store'
import type { MappedField } from '@/types'

export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = await getFormFillJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.user_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (job.status !== 'awaiting_review') {
    return NextResponse.json({ error: 'Job is not awaiting review' }, { status: 400 })
  }

  let body: { action?: string; edited_fields?: MappedField[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { action, edited_fields } = body

  if (action === 'edit_fields' && edited_fields) {
    // Merge user edits into mapped_fields, mark edited ones
    const merged = (job.mapped_fields ?? []).map(mf => {
      const edit = edited_fields.find(e => e.field.selector === mf.field.selector)
      if (edit && edit.value !== mf.value) {
        return { ...mf, value: edit.value, edited: true }
      }
      return mf
    })
    const updated = await updateFormFillJob(job.id, { mapped_fields: merged })
    return NextResponse.json({ job: updated })
  }

  if (action === 'submit') {
    // Signal the waiting worker to proceed with submission
    await updateFormFillJob(job.id, { status: 'submitting', progress_message: 'Submitting form…' })
    return NextResponse.json({ ok: true })
  }

  if (action === 'open_tab') {
    // User will submit themselves — just mark as applied
    await updateFormFillJob(job.id, {
      status: 'completed',
      submit_result: 'Opened in browser — mark as applied when done.',
    })
    // Update saved market status if applicable
    if (job.saved_market_id) {
      await updateSavedMarket(job.saved_market_id, { status: 'applied' }).catch(() => {})
    }
    return NextResponse.json({ url: job.target_url })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
