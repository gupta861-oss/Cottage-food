/**
 * Standalone Playwright worker — spawned by /api/form-fill/start
 * Usage: tsx lib/form-fill-worker.ts <jobId>
 *
 * Runs entirely out of process; writes progress back to .data/form-fill-jobs.json.
 */

import path from 'path'
import fs from 'fs'
import { chromium, Browser, Page } from 'playwright'
import {
  getFormFillJob,
  updateFormFillJob,
  getProducerProfile,
  getProducts,
  getApplicationPacket,
  updateSavedMarket,
} from '@/lib/store'
import type { FormField, MappedField, FormFillJob } from '@/types'

// ── OpenAI (optional, lazy) ───────────────────────────────────────────────────

let _openai: import('openai').default | null | undefined = undefined

function getOpenAI(): import('openai').default | null {
  if (_openai !== undefined) return _openai === undefined ? null : _openai
  if (!process.env.OPENAI_API_KEY) { _openai = null; return null }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OpenAI = require('openai').default ?? require('openai')
    _openai = new OpenAI()
  } catch { _openai = null }
  return _openai ?? null
}

// ── Job store helpers ─────────────────────────────────────────────────────────

function updateJob(jobId: string, updates: Partial<FormFillJob>) {
  return updateFormFillJob(jobId, updates)
}

function readJob(jobId: string): FormFillJob | null {
  return getFormFillJob(jobId)
}

// ── Captcha detection ─────────────────────────────────────────────────────────

async function detectCaptcha(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const selectors = [
      '[id*="captcha"]',
      '[class*="captcha"]',
      '[data-sitekey]',
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'iframe[src*="turnstile"]',
    ]
    return selectors.some(s => document.querySelector(s) !== null)
  })
}

// ── Form field extraction ─────────────────────────────────────────────────────

async function extractFormFields(page: Page): Promise<FormField[]> {
  const url = page.url()

  // Google Forms — use their role structure
  if (url.includes('docs.google.com/forms')) {
    return extractGoogleFormFields(page)
  }

  return page.evaluate(() => {
    const fields: any[] = []
    const seen = new Set<string>()

    const elements = Array.from(
      document.querySelectorAll(
        'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image]):not([type=reset]):not([type=file]), textarea, select'
      )
    ) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[]

    for (const el of elements) {
      // Skip invisible
      const style = window.getComputedStyle(el)
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        el.getAttribute('aria-hidden') === 'true'
      )
        continue

      // Build stable selector
      const id = (el as HTMLInputElement).id
      const name = (el as HTMLInputElement).name ?? ''
      let selector = ''
      if (id) {
        selector = `#${CSS.escape(id)}`
      } else if (name) {
        selector = `[name="${CSS.escape(name)}"]`
      } else {
        const tag = el.tagName.toLowerCase()
        const parent = el.parentElement
        if (parent) {
          const siblings = Array.from(parent.querySelectorAll(tag))
          const idx = siblings.indexOf(el)
          selector = `${tag}:nth-of-type(${idx + 1})`
        }
      }
      if (!selector || seen.has(selector)) continue
      seen.add(selector)

      // Skip CSRF/honeypot
      if (/csrf|_token|honeypot|_wpcf7/i.test(name)) continue

      // Resolve label
      let label = ''
      if (id) {
        const forLabel = document.querySelector(`label[for="${CSS.escape(id)}"]`)
        if (forLabel) label = forLabel.textContent?.trim() ?? ''
      }
      if (!label) {
        let node: Element | null = el
        while (node && !label) {
          const prev = node.previousElementSibling
          if (prev?.tagName === 'LABEL') label = prev.textContent?.trim() ?? ''
          node = node.parentElement
        }
      }
      if (!label) label = el.getAttribute('aria-label') ?? ''
      if (!label) label = (el as HTMLInputElement).placeholder ?? ''
      if (!label) {
        label =
          el.closest('fieldset')?.querySelector('legend')?.textContent?.trim() ?? ''
      }
      if (!label) label = name || selector

      const type = (el as HTMLInputElement).type || el.tagName.toLowerCase()
      const required =
        (el as HTMLInputElement).required ||
        el.getAttribute('aria-required') === 'true'

      let options: string[] | undefined
      if (el.tagName === 'SELECT') {
        options = Array.from((el as HTMLSelectElement).options)
          .filter(o => o.value)
          .map(o => o.text.trim())
      } else if (type === 'radio') {
        const group = Array.from(
          document.querySelectorAll(`input[type=radio][name="${CSS.escape(name)}"]`)
        ) as HTMLInputElement[]
        options = group.map(r => {
          if (r.id) {
            return (
              document.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.textContent?.trim() ??
              r.value
            )
          }
          return r.value
        })
        // Only keep the first radio in a group to avoid duplicates
        if (seen.has(`radio-group-${name}`)) continue
        seen.add(`radio-group-${name}`)
      } else if (type === 'checkbox') {
        // Skip "I agree to terms" type checkboxes — mark them as skipped later
      }

      fields.push({
        selector,
        label,
        type,
        required: !!required,
        options,
        placeholder: (el as HTMLInputElement).placeholder || undefined,
      } satisfies any)
    }

    return fields
  })
}

async function extractGoogleFormFields(page: Page): Promise<FormField[]> {
  return page.evaluate(() => {
    const fields: any[] = []
    const items = document.querySelectorAll('[role="listitem"]')
    let idx = 0
    for (const item of Array.from(items)) {
      const heading = item.querySelector('[role="heading"]')
      const label = heading?.textContent?.trim() ?? `Question ${++idx}`
      const required =
        item.querySelector('[aria-required="true"]') !== null ||
        item.textContent?.includes('*') === true

      // Short answer / paragraph
      const textInput = item.querySelector('input[type="text"], textarea')
      if (textInput) {
        const tag = textInput.tagName.toLowerCase()
        fields.push({
          selector: `[data-params*="${idx}"] ${tag}`,
          label,
          type: tag === 'textarea' ? 'textarea' : 'text',
          required,
        })
        continue
      }

      // Radio / checkbox
      const radioOptions = Array.from(item.querySelectorAll('[role="radio"], [role="checkbox"]'))
      if (radioOptions.length > 0) {
        const type = radioOptions[0].getAttribute('role') === 'radio' ? 'radio' : 'checkbox'
        fields.push({
          selector: `[data-params*="${idx}"] [role="${type}"]`,
          label,
          type,
          required,
          options: radioOptions.map(
            o => o.querySelector('[data-value]')?.textContent?.trim() ?? o.textContent?.trim() ?? ''
          ),
        })
        continue
      }

      // Dropdown
      const dropdown = item.querySelector('[role="listbox"]')
      if (dropdown) {
        fields.push({
          selector: `[data-params*="${idx}"] [role="listbox"]`,
          label,
          type: 'select',
          required,
        })
      }
    }
    return fields
  })
}

// ── LLM field mapping ─────────────────────────────────────────────────────────

interface ProfileBundle {
  owner_name: string
  business_name: string
  city: string
  state: string
  zip: string
  email: string
  phone: string
  website: string
  vendor_bio: string
  business_description: string
  products: string
  selling_goals: string[]
}

async function mapFieldsWithLLM(
  fields: FormField[],
  bundle: ProfileBundle
): Promise<MappedField[]> {
  const openai = getOpenAI()
  if (!openai) return mapFieldsFallback(fields, bundle)

  const prompt = `You are mapping form fields to producer profile data. Return a JSON array.

Profile data:
${JSON.stringify(bundle, null, 2)}

Form fields:
${JSON.stringify(
  fields.map(f => ({ selector: f.selector, label: f.label, type: f.type, required: f.required, options: f.options })),
  null,
  2
)}

Rules:
- For each field, output { selector, value, confidence, source, skipped, warning }
- confidence: "high" (exact match), "medium" (reasonable guess), "low" (best effort)
- source: dot-notation key like "profile.owner_name" or "packet.vendor_bio"
- Set skipped:true for: file uploads, payment fields, CAPTCHA, fields you can't fill
- For "terms" / "agree" checkboxes: value="true", confidence="high", source="auto"
- For select/radio: value must exactly match one of the provided options
- If no good match, set skipped:true with a warning message
- Do NOT make up data. Only use what's in the profile.
- Output ONLY the JSON array, no explanation.`

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    })
    const text = resp.choices[0].message.content ?? ''
    const parsed = JSON.parse(text)
    const arr: any[] = Array.isArray(parsed) ? parsed : (parsed.fields ?? parsed.result ?? [])

    return fields.map(field => {
      const match = arr.find((r: any) => r.selector === field.selector)
      if (!match) return { field, value: '', confidence: 'low' as const, source: 'unmapped', skipped: true }
      return {
        field,
        value: match.value ?? '',
        confidence: (match.confidence ?? 'low') as MappedField['confidence'],
        source: match.source ?? 'llm',
        skipped: !!match.skipped,
        warning: match.warning,
      }
    })
  } catch (err) {
    console.error('LLM mapping failed, falling back:', err)
    return mapFieldsFallback(fields, bundle)
  }
}

// ── Keyword fallback mapping ──────────────────────────────────────────────────

function mapFieldsFallback(fields: FormField[], bundle: ProfileBundle): MappedField[] {
  const rules: Array<{ pattern: RegExp; value: () => string; source: string }> = [
    { pattern: /first.?name|given.?name/i, value: () => bundle.owner_name.split(' ')[0], source: 'profile.owner_name' },
    { pattern: /last.?name|surname|family.?name/i, value: () => bundle.owner_name.split(' ').slice(1).join(' '), source: 'profile.owner_name' },
    { pattern: /full.?name|your.?name|applicant.?name|contact.?name/i, value: () => bundle.owner_name, source: 'profile.owner_name' },
    { pattern: /business.?name|company.?name|vendor.?name|dba/i, value: () => bundle.business_name || bundle.owner_name, source: 'profile.business_name' },
    { pattern: /email/i, value: () => bundle.email, source: 'profile.email' },
    { pattern: /phone|mobile|cell|telephone/i, value: () => bundle.phone, source: 'profile.phone' },
    { pattern: /city/i, value: () => bundle.city, source: 'profile.city' },
    { pattern: /state/i, value: () => bundle.state, source: 'profile.state' },
    { pattern: /zip|postal/i, value: () => bundle.zip, source: 'profile.zip' },
    { pattern: /address/i, value: () => `${bundle.city}, ${bundle.state} ${bundle.zip}`, source: 'profile.address' },
    { pattern: /website|url|web.?site/i, value: () => bundle.website, source: 'profile.website_url' },
    { pattern: /bio|about|description|vendor.?info|tell us/i, value: () => bundle.vendor_bio || bundle.business_description, source: 'packet.vendor_bio' },
    { pattern: /product|item|sell|offer/i, value: () => bundle.products, source: 'profile.products' },
  ]

  const SKIP_PATTERNS = /file|upload|photo|image|logo|document|captcha|payment|fee|credit.?card|ssn|tax.?id|ein/i
  const TERMS_PATTERNS = /agree|terms|certif|acknowledge|consent/i

  return fields.map(field => {
    const haystack = `${field.label} ${field.selector}`.toLowerCase()

    // Skip file/payment/captcha
    if (field.type === 'file' || SKIP_PATTERNS.test(haystack)) {
      return { field, value: '', confidence: 'low', source: 'skipped', skipped: true, warning: 'File upload or payment field — complete manually' }
    }

    // Auto-check terms
    if (field.type === 'checkbox' && TERMS_PATTERNS.test(haystack)) {
      return { field, value: 'true', confidence: 'high', source: 'auto' }
    }

    // Try rules
    for (const rule of rules) {
      if (rule.pattern.test(haystack)) {
        const val = rule.value()
        if (!val) continue
        // For select/radio, try to match an option
        if (field.options?.length) {
          const exact = field.options.find(o => o.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(o.toLowerCase()))
          if (exact) return { field, value: exact, confidence: 'medium', source: rule.source }
          // No matching option — skip
          return { field, value: '', confidence: 'low', source: rule.source, skipped: true, warning: `No matching option for "${val}"` }
        }
        return { field, value: val, confidence: 'high', source: rule.source }
      }
    }

    return { field, value: '', confidence: 'low', source: 'unmapped', skipped: true, warning: 'No matching profile data found' }
  })
}

// ── Form filling ──────────────────────────────────────────────────────────────

async function fillFields(page: Page, mappedFields: MappedField[]): Promise<void> {
  for (const mf of mappedFields) {
    if (mf.skipped || !mf.value) continue

    const { selector, type } = mf.field

    try {
      await page.waitForSelector(selector, { timeout: 3000, state: 'visible' }).catch(() => {})

      if (type === 'select') {
        await page.selectOption(selector, { label: mf.value }).catch(async () => {
          await page.selectOption(selector, mf.value).catch(() => {})
        })
      } else if (type === 'checkbox') {
        if (mf.value === 'true') {
          const checked = await page.$eval(selector, (el: any) => el.checked).catch(() => false)
          if (!checked) await page.click(selector).catch(() => {})
        }
      } else if (type === 'radio') {
        // Click the radio button whose label matches
        const options = mf.field.options ?? []
        const matchIdx = options.findIndex(o => o === mf.value)
        if (matchIdx >= 0) {
          const radios = await page.$$(`input[type=radio][name="${selector.replace(/\[name="(.+)"\]/, '$1')}"]`)
          if (radios[matchIdx]) await radios[matchIdx].click().catch(() => {})
        } else {
          await page.click(selector).catch(() => {})
        }
      } else if (type === 'textarea' || type === 'text' || type === 'email' || type === 'tel' || type === 'number' || type === 'url') {
        await page.fill(selector, mf.value).catch(async () => {
          // Fallback: click and type
          await page.click(selector).catch(() => {})
          await page.keyboard.type(mf.value)
        })
      } else {
        // Generic fallback
        await page.fill(selector, mf.value).catch(() => {})
      }

      // Small delay between fields to appear human
      await new Promise(r => setTimeout(r, 80))
    } catch {
      // Non-fatal — log and continue
      console.warn(`[form-fill] Failed to fill ${selector}`)
    }
  }
}

// ── Screenshot ────────────────────────────────────────────────────────────────

async function takeScreenshot(page: Page, jobId: string): Promise<string> {
  const screenshotsDir = path.join(process.cwd(), '.data', 'screenshots')
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true })
  const screenshotPath = path.join(screenshotsDir, `${jobId}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  return screenshotPath
}

// ── Multi-step form advancement ───────────────────────────────────────────────

async function advancePage(page: Page): Promise<boolean> {
  const nextSelectors = [
    'button:has-text("Next")',
    'button:has-text("Continue")',
    'button:has-text("Proceed")',
    'input[type=submit][value*="Next" i]',
    '[role=button]:has-text("Next")',
  ]
  for (const sel of nextSelectors) {
    const el = await page.$(sel)
    if (el) {
      await el.click()
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
      return true
    }
  }
  return false
}

// ── Build profile bundle ──────────────────────────────────────────────────────

async function buildProfileBundle(job: FormFillJob): Promise<ProfileBundle> {
  const profile = await getProducerProfile(job.user_id)
  const products = profile ? await getProducts(profile.id) : []
  const packet = profile ? await getApplicationPacket(profile.id) : null

  const productNames = products.map(p => p.name).join(', ')
  const productDescriptions = products
    .map(p => [p.name, p.description].filter(Boolean).join(': '))
    .join('; ')

  return {
    owner_name: profile?.owner_name ?? '',
    business_name: profile?.business_name ?? profile?.owner_name ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
    zip: profile?.zip ?? '',
    email: '', // not stored on profile — could be fetched from user record in future
    phone: '', // not stored on profile
    website: profile?.website_url ?? '',
    vendor_bio: packet?.vendor_bio ?? productDescriptions,
    business_description: packet?.business_description ?? '',
    products: productNames,
    selling_goals: profile?.selling_goals ?? [],
  }
}

// ── Main state machine ────────────────────────────────────────────────────────

async function main(jobId: string) {
  const job = readJob(jobId)
  if (!job) {
    console.error(`[form-fill] Job ${jobId} not found`)
    process.exit(1)
  }

  let browser: Browser | null = null

  try {
    // ── navigating ──
    updateJob(jobId, { status: 'navigating', progress_message: 'Opening form page…' })

    browser = await chromium.launch({
      executablePath: '/opt/pw-browsers/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()

    await page.goto(job.target_url, { waitUntil: 'networkidle', timeout: 30000 })

    // ── CAPTCHA check early ──
    if (await detectCaptcha(page)) {
      updateJob(jobId, {
        status: 'captcha_required',
        captcha_url: page.url(),
        progress_message: 'CAPTCHA detected — please solve it to continue.',
      })
      // Stay alive so user can signal us to continue
      let waited = 0
      while (waited < 8 * 60 * 1000) {
        await new Promise(r => setTimeout(r, 3000))
        waited += 3000
        const current = readJob(jobId)
        if (!current || current.status === 'error') break
        // Re-check if CAPTCHA is gone
        if (!(await detectCaptcha(page))) {
          // Continue extraction from where we left off
          updateJob(jobId, { status: 'extracting', progress_message: 'Reading form fields…' })
          break
        }
      }
      if (readJob(jobId)?.status === 'captcha_required') {
        updateJob(jobId, { status: 'error', error_message: 'CAPTCHA was not resolved in time.' })
        await browser.close()
        return
      }
    }

    // ── extracting ──
    updateJob(jobId, { status: 'extracting', progress_message: 'Reading form fields…' })
    const fields = await extractFormFields(page)

    if (fields.length === 0) {
      updateJob(jobId, {
        status: 'error',
        error_message: 'No fillable form fields found on this page. The form may require login or have dynamic content.',
      })
      await browser.close()
      return
    }

    // ── mapping ──
    updateJob(jobId, { status: 'mapping', progress_message: 'Matching your info to form fields…', fields })

    const bundle = await buildProfileBundle(job)
    const mappedFields = await mapFieldsWithLLM(fields, bundle)

    // ── filling ──
    updateJob(jobId, { status: 'filling', progress_message: 'Filling in your details…', mapped_fields: mappedFields })

    await fillFields(page, mappedFields)

    // Handle multi-step: if there's a "Next" button, advance and keep filling
    let steps = 0
    while (steps < 5 && (await advancePage(page))) {
      steps++
      await new Promise(r => setTimeout(r, 1000))
      updateJob(jobId, { progress_message: `Filling page ${steps + 1} of form…` })
      const nextFields = await extractFormFields(page)
      if (nextFields.length > 0) {
        const nextMapped = await mapFieldsWithLLM(nextFields, bundle)
        await fillFields(page, nextMapped)
        // Merge into mapped_fields for review
        const currentJob = readJob(jobId)
        const allMapped = [...(currentJob?.mapped_fields ?? mappedFields), ...nextMapped]
        updateJob(jobId, { mapped_fields: allMapped })
      }
    }

    // ── screenshot_taken ──
    updateJob(jobId, { status: 'screenshot_taken', progress_message: 'Taking screenshot for review…' })
    const screenshotPath = await takeScreenshot(page, jobId)

    // ── awaiting_review ──
    updateJob(jobId, {
      status: 'awaiting_review',
      screenshot_path: screenshotPath,
      progress_message: 'Review the filled form below, then choose how to submit.',
    })

    // ── Poll for submit signal (up to 10 minutes) ──
    const MAX_WAIT = 10 * 60 * 1000
    const POLL_MS = 2000
    let elapsed = 0

    while (elapsed < MAX_WAIT) {
      await new Promise(r => setTimeout(r, POLL_MS))
      elapsed += POLL_MS

      const current = readJob(jobId)
      if (!current) break

      if (current.status === 'submitting') {
        updateJob(jobId, { progress_message: 'Applying your edits and submitting…' })

        // Re-apply any user edits
        if (current.mapped_fields) {
          await fillFields(page, current.mapped_fields)
        }

        // Click submit
        const submitSelectors = [
          'button[type=submit]',
          'input[type=submit]',
          'button:has-text("Submit")',
          'button:has-text("Apply")',
          'button:has-text("Send")',
          '[role=button]:has-text("Submit")',
        ]
        let submitted = false
        for (const sel of submitSelectors) {
          const btn = await page.$(sel)
          if (btn) {
            await btn.click()
            submitted = true
            break
          }
        }

        if (submitted) {
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
          const confirmText = (await page.textContent('body') ?? '').slice(0, 500)
          updateJob(jobId, {
            status: 'completed',
            submit_result: confirmText || 'Form submitted successfully.',
            progress_message: 'Form submitted!',
          })

          // Update saved-market status to applied
          if (current.saved_market_id) {
            await updateSavedMarket(current.saved_market_id, { status: 'applied' }).catch(() => {})
          }
        } else {
          updateJob(jobId, {
            status: 'error',
            error_message: 'Could not find submit button. Please submit manually.',
          })
        }
        break
      }

      if (current.status === 'error') break
    }

    // If we timed out waiting for user review
    const finalJob = readJob(jobId)
    if (finalJob?.status === 'awaiting_review') {
      updateJob(jobId, {
        status: 'error',
        error_message: 'Session timed out waiting for user review.',
      })
    }
  } catch (err: any) {
    console.error('[form-fill] Worker error:', err)
    updateJob(jobId, {
      status: 'error',
      error_message: err?.message ?? 'An unexpected error occurred.',
    })
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

const jobId = process.argv[2]
if (!jobId) {
  console.error('Usage: tsx lib/form-fill-worker.ts <jobId>')
  process.exit(1)
}

main(jobId).catch(err => {
  console.error('[form-fill] Fatal:', err)
  process.exit(1)
})
