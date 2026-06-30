import { getSession } from '@/lib/auth'
import {
  getProducerProfile, getProducts, getDocuments,
  getChecklist, getSavedMarkets
} from '@/lib/store'
import { calculateReadinessScore } from '@/lib/rules-engine'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle, AlertCircle, Clock, ArrowRight, Package,
  FileText, MapPin, FolderOpen, Tag, ChevronRight, Bookmark
} from 'lucide-react'
import { formatDate, isExpiringSoon, isExpired } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const profile = await getProducerProfile(session.user.id)

  if (!profile) {
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Cottage Food Portal</h1>
          <p className="text-gray-600 mb-6">Let's set up your producer profile and generate your personalized readiness plan.</p>
          <Link href="/onboarding">
            <Button size="lg">Start onboarding</Button>
          </Link>
        </div>
      </div>
    )
  }

  const [products, documents, checklistItems, savedMarkets] = await Promise.all([
    getProducts(profile.id),
    getDocuments(profile.id),
    getChecklist(profile.id),
    getSavedMarkets(profile.id),
  ])

  const score = calculateReadinessScore(profile, products, documents, checklistItems)
  const highPriorityItems = checklistItems.filter(i => i.priority === 'high' && i.status === 'not_started').slice(0, 4)
  const expiringDocs = documents.filter(d => isExpiringSoon(d.expiration_date))
  const expiredDocs = documents.filter(d => isExpired(d.expiration_date))
  const productsNeedingLabels = products.filter(p => p.is_food)
  const openMarkets = savedMarkets.filter(s => ['interested', 'ready_to_apply', 'missing_requirements'].includes(s.status))

  const completedItems = checklistItems.filter(i => i.status === 'complete').length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {profile.owner_name.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-600 mt-1">
          {profile.business_name ? profile.business_name + ' · ' : ''}{profile.city}, {profile.state}
        </p>
      </div>

      {/* Readiness Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="md:col-span-2 border-2 border-primary/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Overall Readiness</p>
                <p className="text-4xl font-bold text-gray-900">{score.overall}%</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                score.overall >= 80 ? 'bg-green-100' :
                score.overall >= 50 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {score.overall >= 80
                  ? <CheckCircle className="w-6 h-6 text-green-600" />
                  : score.overall >= 50
                  ? <Clock className="w-6 h-6 text-yellow-600" />
                  : <AlertCircle className="w-6 h-6 text-red-600" />
                }
              </div>
            </div>
            <Progress value={score.overall} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              {completedItems} of {checklistItems.length} checklist items complete
            </p>
          </CardContent>
        </Card>

        {[
          { label: 'Business Profile', value: score.business_profile, href: '/profile' },
          { label: 'Compliance', value: score.compliance, href: '/checklist' },
          { label: 'Labels', value: score.labels, href: '/labels' },
        ].map(item => (
          <Link key={item.label} href={item.href}>
            <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-gray-500 mb-2">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">{item.value}%</p>
                <Progress value={item.value} className="h-1.5" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Next Actions */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Priority next steps</h2>
            <Link href="/checklist">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {highPriorityItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900">You're on track!</p>
                <p className="text-sm text-gray-500">No high-priority items remaining.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {highPriorityItems.map((item, i) => (
                <Link key={item.id} href="/checklist">
                  <div className="flex items-start gap-3 p-4 bg-white border rounded-lg hover:border-primary/30 transition-colors cursor-pointer">
                    <div className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Alerts */}
          {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Document alerts</h2>
              <div className="space-y-2">
                {expiredDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">{doc.file_name} expired</p>
                      <p className="text-xs text-red-700">Expired on {formatDate(doc.expiration_date!)}</p>
                    </div>
                    <Link href="/documents">
                      <Button size="sm" variant="outline" className="text-xs border-red-300">Update</Button>
                    </Link>
                  </div>
                ))}
                {expiringDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">{doc.file_name} expiring soon</p>
                      <p className="text-xs text-yellow-700">Expires {formatDate(doc.expiration_date!)}</p>
                    </div>
                    <Link href="/documents">
                      <Button size="sm" variant="outline" className="text-xs border-yellow-300">Review</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-4">
          {/* Quick links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick access</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0.5">
                {[
                  { href: '/dashboard/products', icon: Package, label: `${products.length} product${products.length !== 1 ? 's' : ''}`, sub: 'Manage catalog' },
                  { href: '/dashboard/labels', icon: Tag, label: `${productsNeedingLabels.length} product${productsNeedingLabels.length !== 1 ? 's' : ''} need labels`, sub: 'Label builder' },
                  { href: '/dashboard/documents', icon: FolderOpen, label: `${documents.length} document${documents.length !== 1 ? 's' : ''}`, sub: 'Document vault' },
                  { href: '/dashboard/saved-markets', icon: Bookmark, label: `${savedMarkets.length} market${savedMarkets.length !== 1 ? 's' : ''} saved`, sub: 'My markets' },
                ].map(item => (
                  <Link key={item.href} href={item.href}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <item.icon className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.sub}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Market status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Market applications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {savedMarkets.length === 0 ? (
                <div className="text-center py-4">
                  <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No markets saved yet</p>
                  <Link href="/markets">
                    <Button size="sm" variant="outline" className="mt-2 text-xs">Browse markets</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {savedMarkets.slice(0, 3).map(sm => (
                    <div key={sm.id} className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-700 truncate">{sm.market?.name}</p>
                      <Badge variant={
                        sm.status === 'accepted' ? 'success' :
                        sm.status === 'applied' ? 'info' :
                        sm.status === 'missing_requirements' ? 'destructive' :
                        sm.status === 'ready_to_apply' ? 'success' :
                        'muted'
                      } className="text-xs shrink-0">
                        {sm.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                  <Link href="/saved-markets">
                    <Button variant="ghost" size="sm" className="w-full mt-1 text-xs">
                      View all markets
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border text-xs text-gray-500">
        This checklist is based on the information you provided and available public guidance. Requirements can vary by city, market, product, and selling channel. Review official sources before submitting anything.
      </div>
    </div>
  )
}
