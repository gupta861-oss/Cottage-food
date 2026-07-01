import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import {
  getProducerProfile, getFormFillJob, getFormFillJobsForUser,
  createFormFillJob, getMarkets,
} from '@/lib/store'
import path from 'path'
import { spawn } from 'child_process'

const ALLOWED_DOMAINS = new Set([
  'mda.state.mn.us',
  'sos.state.mn.us',
  'docs.google.com',
  'form.jotform.com',
  'forms.gle',
  'app.managemymarket.com',
  'zapplication.org',
])

function isAllowedUrl(url: string, marketAppUrls: string[]): boolean {
  try {
    const { hostname } = new URL(url)
    if (ALLOWED_DOMAINS.has(hostname)) return true
    // Also allow any registered market's application URL domain
    for (const mUrl of marketAppUrls) {
      try {
        if (new URL(mUrl).hostname === hostname) return true
      } catch { /* skip */ }
    }
    return false
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProducerProfile(session.user.id)
  if (!profile) return NextResponse.json({ error: 'No producer profile' }, { status: 400 })

  let body: { target_url?: string; form_type?: string; saved_market_id?: string; checklist_item_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { target_url, form_type, saved_market_id, checklist_item_id } = body

  if (!target_url || !form_type) {
    return NextResponse.json({ error: 'target_url and form_type are required' }, { status: 400 })
  }

  const validFormTypes = ['market_application', 'cottage_food_registration', 'dba_registration']
  if (!validFormTypes.includes(form_type)) {
    return NextResponse.json({ error: 'Invalid form_type' }, { status: 400 })
  }

  // Validate URL against allowlist
  const markets = await getMarkets()
  const marketAppUrls = markets.map(m => m.application_url).filter(Boolean) as string[]
  if (!isAllowedUrl(target_url, marketAppUrls)) {
    return NextResponse.json({ error: 'URL not permitted' }, { status: 403 })
  }

  // Reject duplicate active jobs for the same saved_market_id
  if (saved_market_id) {
    const existingJobs = getFormFillJobsForUser(session.user.id)
    const activeStatuses = new Set(['queued', 'navigating', 'extracting', 'mapping', 'filling', 'screenshot_taken', 'awaiting_review', 'submitting'])
    const duplicate = existingJobs.find(j => j.saved_market_id === saved_market_id && activeStatuses.has(j.status))
    if (duplicate) {
      return NextResponse.json({ jobId: duplicate.id, existing: true })
    }
  }

  const job = createFormFillJob({
    user_id: session.user.id,
    producer_profile_id: profile.id,
    target_url,
    form_type: form_type as FormFillJob['form_type'],
    saved_market_id,
    checklist_item_id,
    status: 'queued',
    progress_message: 'Starting up…',
  })

  // Spawn detached worker
  const workerPath = path.join(process.cwd(), 'lib', 'form-fill-worker.ts')
  try {
    const child = spawn('tsx', [workerPath, job.id], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: '/opt/pw-browsers',
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
      },
    })
    child.unref()
  } catch (err) {
    console.error('Failed to spawn worker:', err)
    // Job will stay in 'queued' and time out — not fatal for the response
  }

  return NextResponse.json({ jobId: job.id }, { status: 201 })
}

// Needed for TypeScript — FormFillJob type used via store
import type { FormFillJob } from '@/types'
