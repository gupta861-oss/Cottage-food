'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, ExternalLink, Edit2, Send, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import type { FormFillJob, MappedField } from '@/types'

// ── Progress indicator ────────────────────────────────────────────────────────

const PROGRESS_STEPS = ['navigating', 'extracting', 'mapping', 'filling', 'screenshot_taken', 'awaiting_review']

function ProgressBar({ status }: { status: string }) {
  const idx = PROGRESS_STEPS.indexOf(status)
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / PROGRESS_STEPS.length) * 100)
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
      <div
        className="bg-green-500 h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: MappedField['confidence'] }) {
  if (confidence === 'high') return <Badge className="bg-green-100 text-green-800 text-xs">High</Badge>
  if (confidence === 'medium') return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Medium</Badge>
  return <Badge className="bg-red-100 text-red-800 text-xs">Low</Badge>
}

// ── Field editor table ────────────────────────────────────────────────────────

function FieldEditor({
  mappedFields,
  onChange,
}: {
  mappedFields: MappedField[]
  onChange: (fields: MappedField[]) => void
}) {
  const visible = mappedFields.filter(mf => !mf.skipped)

  const update = (selector: string, value: string) => {
    onChange(
      mappedFields.map(mf =>
        mf.field.selector === selector ? { ...mf, value, edited: true } : mf
      )
    )
  }

  if (visible.length === 0) {
    return <p className="text-sm text-gray-500">No editable fields detected.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium w-1/3">Field</th>
            <th className="pb-2 pr-4 font-medium w-1/2">Value</th>
            <th className="pb-2 pr-2 font-medium">Confidence</th>
            <th className="pb-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(mf => (
            <tr key={mf.field.selector} className="border-b last:border-0">
              <td className="py-2 pr-4 text-gray-700 font-medium">
                {mf.field.label}
                {mf.field.required && <span className="text-red-500 ml-1">*</span>}
                {mf.edited && (
                  <span className="ml-1">
                    <Edit2 className="w-3 h-3 inline text-blue-500" />
                  </span>
                )}
                {mf.warning && (
                  <p className="text-xs text-yellow-600 mt-0.5">{mf.warning}</p>
                )}
              </td>
              <td className="py-2 pr-4">
                <Input
                  value={mf.value}
                  onChange={e => update(mf.field.selector, e.target.value)}
                  className="h-7 text-sm"
                />
              </td>
              <td className="py-2 pr-2">
                <ConfidenceBadge confidence={mf.confidence} />
              </td>
              <td className="py-2 text-xs text-gray-400">{mf.source}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {mappedFields.some(mf => mf.skipped) && (
        <details className="mt-4">
          <summary className="text-xs text-gray-400 cursor-pointer">
            {mappedFields.filter(mf => mf.skipped).length} skipped fields (file uploads, payment, etc.)
          </summary>
          <ul className="mt-2 space-y-1">
            {mappedFields.filter(mf => mf.skipped).map(mf => (
              <li key={mf.field.selector} className="text-xs text-gray-400">
                {mf.field.label}: {mf.warning ?? 'Skipped'}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TERMINAL = new Set(['completed', 'error', 'captcha_required', 'payment_required'])

export default function FormFillPage() {
  const params = useParams<{ jobId: string }>()
  const router = useRouter()
  const jobId = params.jobId

  const [job, setJob] = useState<FormFillJob | null>(null)
  const [editedFields, setEditedFields] = useState<MappedField[]>([])
  const [submitting, setSubmitting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = async () => {
    const res = await fetch(`/api/form-fill/${jobId}`).catch(() => null)
    if (!res?.ok) return
    const { job: fetched } = await res.json()
    if (!fetched) return
    setJob(fetched)
    if (fetched.mapped_fields && editedFields.length === 0) {
      setEditedFields(fetched.mapped_fields)
    }
    if (TERMINAL.has(fetched.status) && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  // Sync edits when server pushes new mapped_fields (e.g. after user saved edits remotely)
  useEffect(() => {
    if (job?.mapped_fields && editedFields.length === 0) {
      setEditedFields(job.mapped_fields)
    }
  }, [job?.mapped_fields, editedFields.length])

  const cancelJob = async () => {
    if (!confirm('Cancel this form-fill session?')) return
    await fetch(`/api/form-fill/${jobId}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  const handleSubmitForMe = async () => {
    setSubmitting(true)
    try {
      // First push edits
      if (editedFields.length > 0) {
        await fetch(`/api/form-fill/${jobId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit_fields', edited_fields: editedFields }),
        })
      }
      // Then trigger submit
      await fetch(`/api/form-fill/${jobId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      })
      toast({ title: 'Submitting…', description: 'The form is being submitted. This page will update when done.' })
      // Resume polling
      if (!pollRef.current) {
        pollRef.current = setInterval(poll, 2000)
      }
    } catch {
      toast({ title: 'Error', description: 'Could not trigger submission.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenTab = async () => {
    const res = await fetch(`/api/form-fill/${jobId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open_tab' }),
    })
    const { url } = await res.json()
    if (url) window.open(url, '_blank')
    toast({ title: 'Opened in browser', description: 'Mark as applied when you\'re done.' })
    router.push('/saved-markets')
  }

  if (!job) {
    return (
      <div className="p-8 flex items-center gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading…
      </div>
    )
  }

  // ── Progress view ──
  if (!TERMINAL.has(job.status) && job.status !== 'awaiting_review') {
    return (
      <div className="p-8 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-green-600" />
            <p className="text-lg font-semibold text-gray-800">{job.progress_message}</p>
            <ProgressBar status={job.status} />
            <p className="text-xs text-gray-400 capitalize">Status: {job.status.replace(/_/g, ' ')}</p>
            <Button variant="ghost" size="sm" onClick={cancelJob} className="text-gray-400">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── CAPTCHA view ──
  if (job.status === 'captcha_required') {
    return (
      <div className="p-8 max-w-2xl">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 mx-auto text-yellow-500" />
            <h2 className="text-lg font-semibold">CAPTCHA Required</h2>
            <p className="text-sm text-gray-600">
              This form has a CAPTCHA. Please open the form, complete the CAPTCHA, then come back here.
            </p>
            {job.captcha_url && (
              <a href={job.captcha_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open form to solve CAPTCHA
                </Button>
              </a>
            )}
            <p className="text-xs text-gray-400">
              The page will automatically continue once the CAPTCHA clears.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Error / Done view ──
  if (job.status === 'error') {
    return (
      <div className="p-8 max-w-2xl">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-gray-600">{job.error_message ?? 'An unexpected error occurred.'}</p>
            {job.target_url && (
              <a href={job.target_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open form manually
                </Button>
              </a>
            )}
            <Button variant="ghost" onClick={() => router.push('/saved-markets')}>
              Back to My Markets
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (job.status === 'completed') {
    return (
      <div className="p-8 max-w-2xl">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="w-10 h-10 mx-auto text-green-500" />
            <h2 className="text-lg font-semibold">Form Submitted!</h2>
            {job.submit_result && (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.submit_result}</p>
            )}
            <Button onClick={() => router.push('/saved-markets')}>View My Markets</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Review view (awaiting_review or submitting) ──
  const isSubmitting = job.status === 'submitting'

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Filled Form</h1>
          <p className="text-sm text-gray-500 mt-1">
            We&apos;ve pre-filled the form using your profile. Review the fields below, edit any values, then choose how to submit.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={cancelJob} className="text-gray-400">
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screenshot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={`/api/form-fill/${jobId}/screenshot`}
              alt="Filled form preview"
              className="w-full rounded border border-gray-200"
            />
            <a
              href={job.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 mt-2 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> View live form
            </a>
          </CardContent>
        </Card>

        {/* Field editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-Filled Fields</CardTitle>
            </CardHeader>
            <CardContent>
              {editedFields.length > 0 ? (
                <FieldEditor
                  mappedFields={editedFields}
                  onChange={setEditedFields}
                />
              ) : (
                <p className="text-sm text-gray-500">No field data available.</p>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {isSubmitting ? (
                <div className="flex items-center gap-3 text-green-700">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Submitting your application…</span>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={handleSubmitForMe}
                    disabled={submitting}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit for me
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleOpenTab}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    I&apos;ll submit myself
                  </Button>
                  <p className="text-xs text-gray-400 text-center">
                    &ldquo;Submit for me&rdquo; will click the submit button in the background.
                    Your edits above will be applied first.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
