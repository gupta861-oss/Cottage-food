'use client'

import { useEffect, useState } from 'react'
import { MapPin, ExternalLink, Bookmark, BookmarkCheck, Search, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { Market, SavedMarket } from '@/types'
import { PRODUCT_CATEGORY_LABELS, formatDateShort, cn } from '@/lib/utils'

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [savedMarkets, setSavedMarkets] = useState<SavedMarket[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [mRes, sRes] = await Promise.all([
      fetch('/api/markets'),
      fetch('/api/saved-markets'),
    ])
    const { markets } = await mRes.json()
    const { savedMarkets } = await sRes.json()
    setMarkets(markets ?? [])
    setSavedMarkets(savedMarkets ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const isSaved = (marketId: string) => savedMarkets.some(s => s.market_id === marketId)
  const getSaved = (marketId: string) => savedMarkets.find(s => s.market_id === marketId)

  const toggleSave = async (market: Market) => {
    const saved = getSaved(market.id)
    if (saved) {
      await fetch(`/api/saved-markets/${saved.id}`, { method: 'DELETE' })
      setSavedMarkets(sm => sm.filter(s => s.id !== saved.id))
      toast({ title: 'Market removed from your list' })
    } else {
      const res = await fetch('/api/saved-markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: market.id, status: 'interested' }),
      })
      const { savedMarket } = await res.json()
      setSavedMarkets(sm => [...sm, { ...savedMarket, market }])
      toast({ title: 'Market saved to your list' })
    }
  }

  const filtered = markets.filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.city.toLowerCase().includes(search.toLowerCase()) ||
    m.state.toLowerCase().includes(search.toLowerCase())
  )

  const now = new Date()
  const isOpen = (m: Market) => {
    if (!m.application_open_date || !m.application_close_date) return false
    const open = new Date(m.application_open_date)
    const close = new Date(m.application_close_date)
    return open <= now && now <= close
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading markets…</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Farmers Market Directory</h1>
        <p className="text-gray-600 mt-1">Browse markets, review requirements, and save the ones you want to apply to.</p>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by market name or city…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No markets found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(market => {
            const saved = getSaved(market.id)
            const open = isOpen(market)
            return (
              <Card key={market.id} className={cn('transition-all', open && 'border-green-300 bg-green-50/30')}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-gray-900">{market.name}</h3>
                            {open && <Badge variant="success" className="text-xs">Applications open</Badge>}
                            {!open && market.application_open_date && new Date(market.application_open_date) > now && (
                              <Badge variant="info" className="text-xs">Opens {formatDateShort(market.application_open_date)}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                            <MapPin className="w-3.5 h-3.5" />
                            {market.city}, {market.state}
                            {market.address && ` — ${market.address}`}
                          </div>
                        </div>

                        <Button
                          variant={saved ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleSave(market)}
                          className="gap-1.5 shrink-0"
                        >
                          {saved
                            ? <><BookmarkCheck className="w-3.5 h-3.5" /> Saved</>
                            : <><Bookmark className="w-3.5 h-3.5" /> Save</>
                          }
                        </Button>
                      </div>

                      {/* Requirements */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <div className={cn(
                          'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium',
                          market.insurance_required ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-500'
                        )}>
                          <Shield className="w-3 h-3" />
                          Insurance {market.insurance_required ? 'required' : 'not required'}
                        </div>
                        <div className={cn(
                          'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium',
                          market.license_required ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'
                        )}>
                          <CheckCircle className="w-3 h-3" />
                          License {market.license_required ? 'required' : 'not required'}
                        </div>
                        {market.producer_only && (
                          <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-purple-50 text-purple-700">
                            Producer-only
                          </div>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                        {market.application_open_date && (
                          <span>App opens: {formatDateShort(market.application_open_date)}</span>
                        )}
                        {market.application_close_date && (
                          <span className={cn(
                            open ? 'text-green-700 font-medium' :
                            new Date(market.application_close_date) < now ? 'text-red-500' : ''
                          )}>
                            App deadline: {formatDateShort(market.application_close_date)}
                          </span>
                        )}
                        {market.season_start_date && market.season_end_date && (
                          <span>Season: {formatDateShort(market.season_start_date)} – {formatDateShort(market.season_end_date)}</span>
                        )}
                        {market.fee_notes && <span>Fees: {market.fee_notes}</span>}
                      </div>

                      {/* Requirements text */}
                      {market.requirements && (
                        <p className="text-xs text-gray-600 mb-3">{market.requirements}</p>
                      )}

                      {/* Categories */}
                      {market.categories_accepted && market.categories_accepted.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {market.categories_accepted.map(cat => (
                            <span key={cat} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {PRODUCT_CATEGORY_LABELS[cat] ?? cat}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Links */}
                      <div className="flex gap-3">
                        {market.website_url && (
                          <a
                            href={market.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Website <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {market.application_url && (
                          <a
                            href={market.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            Apply <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Saved status */}
                      {saved && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Your status:</span>
                            <Badge variant={
                              saved.status === 'accepted' ? 'success' :
                              saved.status === 'applied' ? 'info' :
                              saved.status === 'missing_requirements' ? 'destructive' :
                              saved.status === 'ready_to_apply' ? 'success' : 'muted'
                            } className="text-xs">
                              {saved.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
