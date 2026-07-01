'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, MapPin, ExternalLink, Trash2, Calendar, Wand2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { SavedMarket, SavedMarketStatus } from '@/types'
import { formatDateShort, cn } from '@/lib/utils'

const STATUS_OPTIONS: { value: SavedMarketStatus; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'missing_requirements', label: 'Missing requirements' },
  { value: 'ready_to_apply', label: 'Ready to apply' },
  { value: 'applied', label: 'Applied' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' },
]

const statusBadge = (status: SavedMarketStatus) => {
  switch (status) {
    case 'accepted': return 'success'
    case 'applied': return 'info'
    case 'missing_requirements': return 'destructive'
    case 'ready_to_apply': return 'success'
    case 'waitlisted': return 'warning'
    case 'rejected': return 'destructive'
    case 'closed': return 'muted'
    default: return 'secondary'
  }
}

export default function SavedMarketsPage() {
  const router = useRouter()
  const [savedMarkets, setSavedMarkets] = useState<SavedMarket[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch('/api/saved-markets').then(r => r.json()).then(({ savedMarkets }) => {
      setSavedMarkets(savedMarkets ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: SavedMarketStatus) => {
    await fetch(`/api/saved-markets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSavedMarkets(ms => ms.map(m => m.id === id ? { ...m, status } : m))
    toast({ title: 'Status updated' })
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this market from your list?')) return
    await fetch(`/api/saved-markets/${id}`, { method: 'DELETE' })
    setSavedMarkets(ms => ms.filter(m => m.id !== id))
    toast({ title: 'Market removed' })
  }

  const startFormFill = async (sm: SavedMarket): Promise<void> => {
    const appUrl = sm.market?.application_url
    if (!appUrl) return
    const res = await fetch('/api/form-fill/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_url: appUrl, form_type: 'market_application', saved_market_id: sm.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Cannot auto-fill', description: data.error ?? 'URL not supported.', variant: 'destructive' })
      return
    }
    router.push(`/form-fill/${data.jobId}`)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>

  const groups = {
    active: savedMarkets.filter(m => ['interested', 'ready_to_apply', 'missing_requirements'].includes(m.status)),
    applied: savedMarkets.filter(m => ['applied', 'waitlisted', 'accepted'].includes(m.status)),
    past: savedMarkets.filter(m => ['rejected', 'closed'].includes(m.status)),
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Markets</h1>
          <p className="text-gray-600 mt-1">Track your market applications and deadlines.</p>
        </div>
        <Link href="/markets">
          <Button variant="outline" className="gap-2">
            <MapPin className="w-4 h-4" /> Browse markets
          </Button>
        </Link>
      </div>

      {savedMarkets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">No markets saved yet</h3>
            <p className="text-sm text-gray-500 mb-4">Browse markets and save the ones you want to apply to.</p>
            <Link href="/markets">
              <Button>Browse farmers markets</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Tracking', value: savedMarkets.length, color: 'text-gray-900' },
              { label: 'Applied / In process', value: groups.applied.length, color: 'text-blue-700' },
              { label: 'Accepted', value: savedMarkets.filter(m => m.status === 'accepted').length, color: 'text-green-700' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border rounded-xl p-4 text-center">
                <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Active markets */}
          {groups.active.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Considering / Ready to apply</h2>
              <div className="space-y-3">
                {groups.active.map(sm => (
                  <MarketCard key={sm.id} sm={sm} onUpdateStatus={updateStatus} onRemove={remove} onAutoFill={startFormFill} />
                ))}
              </div>
            </div>
          )}

          {/* Applied / accepted */}
          {groups.applied.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Applications in progress</h2>
              <div className="space-y-3">
                {groups.applied.map(sm => (
                  <MarketCard key={sm.id} sm={sm} onUpdateStatus={updateStatus} onRemove={remove} onAutoFill={startFormFill} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {groups.past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 text-gray-400">Closed / Past</h2>
              <div className="space-y-3 opacity-60">
                {groups.past.map(sm => (
                  <MarketCard key={sm.id} sm={sm} onUpdateStatus={updateStatus} onRemove={remove} onAutoFill={startFormFill} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MarketCard({
  sm, onUpdateStatus, onRemove, onAutoFill
}: {
  sm: SavedMarket
  onUpdateStatus: (id: string, status: SavedMarketStatus) => void
  onRemove: (id: string) => void
  onAutoFill: (sm: SavedMarket) => Promise<void>
}) {
  const [filling, setFilling] = useState(false)
  const market = sm.market
  const now = new Date()
  const deadlinePassed = market?.application_close_date && new Date(market.application_close_date) < now

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-gray-900">{market?.name ?? 'Unknown market'}</h3>
              <Badge variant={statusBadge(sm.status) as any} className="text-xs">
                {sm.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              {market?.city}, {market?.state}
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
              {market?.application_close_date && (
                <span className={cn(
                  'flex items-center gap-1',
                  !deadlinePassed && 'text-amber-700 font-medium',
                  deadlinePassed && 'text-gray-400 line-through'
                )}>
                  <Calendar className="w-3 h-3" />
                  Deadline: {formatDateShort(market.application_close_date)}
                </span>
              )}
              {market?.season_start_date && (
                <span>Season: {formatDateShort(market.season_start_date)} – {formatDateShort(market.season_end_date ?? '')}</span>
              )}
            </div>

            {sm.status === 'missing_requirements' && (
              <p className="text-xs text-red-600 mb-3">
                ⚠ You may be missing required documents for this market. Check your document vault.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {market?.application_url && (
                <>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={filling}
                    onClick={async () => {
                      setFilling(true)
                      await onAutoFill(sm).finally(() => setFilling(false))
                    }}
                  >
                    {filling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    Auto-fill application
                  </Button>
                  <a
                    href={market.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:underline"
                  >
                    Apply manually <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
              {market?.website_url && (
                <a
                  href={market.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:underline"
                >
                  Website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={sm.status} onValueChange={v => onUpdateStatus(sm.id, v as SavedMarketStatus)}>
              <SelectTrigger className="w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => onRemove(sm.id)}>
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
