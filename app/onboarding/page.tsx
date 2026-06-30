'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Send, CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ExtractedData {
  owner_name?: string
  business_name?: string
  city?: string
  state?: string
  production_location_type?: string
  business_stage?: string
  sells_now?: boolean
  selling_goals?: string[]
  products?: Array<{
    name: string
    category: string
    is_food: boolean
    shelf_stable: boolean
    allergens: string[]
  }>
  has_cottage_food_registration?: boolean
  has_food_safety_training?: boolean
  has_business_registration?: boolean
  has_insurance?: boolean
  has_product_labels?: boolean
  has_product_photos?: boolean
}

// Render assistant message text: bold + newlines, no dangerouslySetInnerHTML
function MessageText({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((seg, si) =>
            seg.startsWith('**') && seg.endsWith('**')
              ? <strong key={si}>{seg.slice(2, -2)}</strong>
              : seg
          )}
        </span>
      ))}
    </>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4 px-1">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="block w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [extracted, setExtracted] = useState<ExtractedData>({})
  const [complete, setComplete] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [booted, setBooted] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendToBot = useCallback(async (msgs: Message[], current: ExtractedData) => {
    setIsTyping(true)
    try {
      const res = await fetch('/api/onboarding-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, extracted: current }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      const merged = { ...current, ...(data.updates ?? {}) }
      setExtracted(merged)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      if (data.complete) setComplete(true)
    } catch {
      toast({ title: 'Connection error', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setIsTyping(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [])

  // Boot: get initial greeting
  useEffect(() => {
    if (booted) return
    setBooted(true)
    sendToBot([], {})
  }, [booted, sendToBot])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isTyping || submitting || complete) return

    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    await sendToBot(next, extracted)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const profileRes = await fetch('/api/producer-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_name: extracted.owner_name ?? 'Producer',
          business_name: extracted.business_name ?? '',
          city: extracted.city ?? '',
          state: extracted.state ?? 'MN',
          business_stage: extracted.business_stage ?? 'new',
          production_location_type: extracted.production_location_type ?? 'home',
          sells_now: extracted.sells_now ?? false,
          selling_goals: extracted.selling_goals ?? ['farmers_markets'],
        }),
      })
      if (!profileRes.ok) throw new Error('Failed to create profile')

      for (const product of extracted.products ?? []) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        })
      }

      const docMap = [
        { key: 'has_cottage_food_registration', type: 'cottage_food_registration', name: 'Cottage Food Registration' },
        { key: 'has_food_safety_training', type: 'food_safety_training', name: 'Food Safety Training Certificate' },
        { key: 'has_business_registration', type: 'business_registration', name: 'Business Registration' },
        { key: 'has_insurance', type: 'insurance_certificate', name: 'Insurance Certificate' },
        { key: 'has_product_labels', type: 'label', name: 'Product Label' },
        { key: 'has_product_photos', type: 'product_photo', name: 'Product Photos' },
      ]
      for (const d of docMap) {
        if ((extracted as Record<string, unknown>)[d.key]) {
          await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_type: d.type, file_name: d.name, status: 'active' }),
          })
        }
      }

      await fetch('/api/checklist', { method: 'POST' })
      router.push('/dashboard')
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' })
      setSubmitting(false)
    }
  }

  const progressItems = [
    { label: 'Name', done: !!extracted.owner_name },
    { label: 'Location', done: !!(extracted.city && extracted.state) },
    { label: `Product${(extracted.products?.length ?? 0) > 1 ? 's' : ''}`, done: !!(extracted.products?.length) },
    { label: 'Selling goals', done: !!(extracted.selling_goals?.length) },
  ]
  const doneCount = progressItems.filter(p => p.done).length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shrink-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-3xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900">Cottage Food Portal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-gray-500 font-medium">Setup assistant</span>
          </div>
        </div>
      </header>

      {/* Progress strip */}
      <div className="bg-white border-b shrink-0">
        <div className="container mx-auto px-4 py-2.5 max-w-3xl">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / progressItems.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0 ml-2">{doneCount}/{progressItems.length}</span>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-0.5">
            {progressItems.map(item => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-1 text-xs shrink-0 transition-colors',
                  item.done ? 'text-green-700 font-medium' : 'text-gray-400'
                )}
              >
                {item.done
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  : <Circle className="w-3.5 h-3.5" />
                }
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
                )}
              >
                <MessageText content={msg.content} />
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}

          {/* Generate plan CTA */}
          {complete && !isTyping && (
            <div className="flex flex-col items-center gap-3 pt-4 pb-2">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-3">Your profile is ready to go!</p>
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-2 px-8 shadow-md"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating your plan…</>
                  ) : (
                    <>✨ Generate my readiness plan</>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-white border-t shrink-0">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleTextareaInput}
              placeholder={
                complete
                  ? 'All set — tap the button above to generate your plan!'
                  : 'Type your message… (Enter to send, Shift+Enter for new line)'
              }
              disabled={isTyping || submitting || complete}
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60',
                'placeholder:text-gray-400 transition-colors',
                (isTyping || submitting || complete) && 'opacity-50 cursor-not-allowed bg-gray-50'
              )}
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping || submitting || complete}
              size="icon"
              className="rounded-xl h-[42px] w-[42px] shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 text-center">
            This assistant only helps set up your cottage food business profile — nothing else.
          </p>
        </div>
      </div>
    </div>
  )
}
