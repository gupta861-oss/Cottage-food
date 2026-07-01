'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, RefreshCw, ExternalLink, AlertCircle, Wand2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { ChecklistItem, ChecklistStatus } from '@/types'
import { CHECKLIST_CATEGORY_LABELS, cn } from '@/lib/utils'

const AUTO_REGISTER_DOMAINS = ['mda.state.mn.us', 'sos.state.mn.us']

function isAutoRegisterable(url?: string): boolean {
  if (!url) return false
  try { return AUTO_REGISTER_DOMAINS.some(d => new URL(url).hostname.includes(d)) } catch { return false }
}

const STATUS_OPTIONS: { value: ChecklistStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not started', color: 'text-gray-500 bg-gray-50 border-gray-200' },
  { value: 'in_progress', label: 'In progress', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'complete', label: 'Complete', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'blocked', label: 'Blocked', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'not_applicable', label: 'N/A', color: 'text-gray-400 bg-gray-50 border-gray-200' },
]

const CATEGORY_TABS = [
  { value: 'all', label: 'All' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'labels', label: 'Labels' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'market_applications', label: 'Markets' },
  { value: 'business_setup', label: 'Business' },
  { value: 'product_prep', label: 'Products' },
]

export default function ChecklistPage() {
  const router = useRouter()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [fillingId, setFillingId] = useState<string | null>(null)

  const startAutoRegister = async (item: ChecklistItem) => {
    if (!item.external_url) return
    setFillingId(item.id)
    try {
      const res = await fetch('/api/form-fill/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: item.external_url,
          form_type: 'cottage_food_registration',
          checklist_item_id: item.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Cannot auto-fill', description: data.error ?? 'URL not supported.', variant: 'destructive' })
        return
      }
      router.push(`/form-fill/${data.jobId}`)
    } finally {
      setFillingId(null)
    }
  }

  const load = async () => {
    const res = await fetch('/api/checklist')
    const { items } = await res.json()
    setItems(items ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const regenerate = async () => {
    setRegenerating(true)
    await fetch('/api/checklist', { method: 'POST' })
    await load()
    setRegenerating(false)
    toast({ title: 'Checklist regenerated' })
  }

  const updateStatus = async (id: string, status: ChecklistStatus) => {
    await fetch(`/api/checklist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setItems(items => items.map(i => i.id === id ? { ...i, status } : i))
  }

  const complete = items.filter(i => i.status === 'complete').length
  const pct = items.length > 0 ? Math.round((complete / items.length) * 100) : 0

  const filterItems = (tab: string) => {
    if (tab === 'all') return items
    return items.filter(i => i.category === tab)
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading checklist…</div>
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Readiness Checklist</h1>
          <p className="text-gray-600 mt-1">Your personalized roadmap to becoming market-ready.</p>
        </div>
        <Button variant="outline" onClick={regenerate} disabled={regenerating} className="gap-2">
          <RefreshCw className={cn('w-4 h-4', regenerating && 'animate-spin')} />
          Regenerate
        </Button>
      </div>

      {/* Progress */}
      <div className="bg-white border rounded-xl p-5 mb-6 flex items-center gap-6">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="32" cy="32" r="28" fill="none" stroke="#f28014" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 28 * pct / 100} ${2 * Math.PI * 28}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
            {pct}%
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{complete} of {items.length} complete</p>
          <p className="text-sm text-gray-500">
            {items.filter(i => i.status === 'not_started' && i.priority === 'high').length} high-priority items remaining
          </p>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          {['high', 'medium', 'low'].map(p => {
            const count = items.filter(i => i.priority === p && i.status !== 'complete').length
            return count > 0 ? (
              <div key={p} className={cn('px-3 py-1 rounded-full text-xs font-medium',
                p === 'high' ? 'bg-red-50 text-red-700' :
                p === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              )}>
                {count} {p}
              </div>
            ) : null
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-xl">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No checklist items yet</h3>
          <p className="text-sm text-gray-500 mb-4">Complete your profile and add products to generate your checklist.</p>
          <Button onClick={regenerate}>Generate checklist</Button>
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {CATEGORY_TABS.map(tab => {
              const count = filterItems(tab.value).filter(i => i.status !== 'complete').length
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1.5 bg-gray-200 text-gray-700 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">{count}</span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {CATEGORY_TABS.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              <div className="space-y-3">
                {filterItems(tab.value).sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 }
                  if (a.status === 'complete' && b.status !== 'complete') return 1
                  if (b.status === 'complete' && a.status !== 'complete') return -1
                  return order[a.priority] - order[b.priority]
                }).map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      'bg-white border rounded-xl p-4 transition-opacity',
                      item.status === 'complete' && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                          <Badge variant={
                            item.priority === 'high' ? 'destructive' :
                            item.priority === 'medium' ? 'warning' : 'info'
                          } className="text-[10px]">
                            {item.priority}
                          </Badge>
                          <Badge variant="muted" className="text-[10px]">
                            {CHECKLIST_CATEGORY_LABELS[item.category]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        {item.reason && (
                          <p className="text-xs text-gray-400 italic">Why this matters: {item.reason}</p>
                        )}
                        {item.external_url && (
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {isAutoRegisterable(item.external_url) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs gap-1 px-2"
                                disabled={fillingId === item.id}
                                onClick={() => startAutoRegister(item)}
                              >
                                {fillingId === item.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Wand2 className="w-3 h-3" />}
                                Auto-register
                              </Button>
                            )}
                            <a
                              href={item.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Learn more <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        <select
                          value={item.status}
                          onChange={e => updateStatus(item.id, e.target.value as ChecklistStatus)}
                          className="text-xs rounded-lg border px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border text-xs text-gray-500">
        <AlertCircle className="w-3 h-3 inline mr-1" />
        This checklist is based on the information you provided. Requirements vary by city, market, product, and selling channel. Review official sources before submitting anything.
      </div>
    </div>
  )
}
