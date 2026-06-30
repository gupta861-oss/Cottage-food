import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getMarkets } from '@/lib/store'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Settings, Package, Users, ExternalLink } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import fs from 'fs'
import path from 'path'

async function getStats() {
  const dataDir = path.join(process.cwd(), '.data')
  const readJson = (file: string) => {
    try {
      const f = path.join(dataDir, file)
      if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'))
    } catch {}
    return []
  }
  return {
    users: readJson('users.json').length,
    profiles: readJson('producer-profiles.json').length,
    products: readJson('products.json').length,
    documents: readJson('documents.json').length,
    checklistItems: readJson('checklist.json').length,
  }
}

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-4">This page is for admin users only.</p>
          <Link href="/dashboard"><Button>Go to dashboard</Button></Link>
        </div>
      </div>
    )
  }

  const [markets, stats] = await Promise.all([getMarkets(), getStats()])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <span className="font-bold">Admin Panel</span>
        </div>
        <Link href="/dashboard"><Button variant="outline" size="sm">Back to dashboard</Button></Link>
      </header>

      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Users', value: stats.users, icon: Users },
            { label: 'Producer profiles', value: stats.profiles, icon: Package },
            { label: 'Products', value: stats.products, icon: Package },
            { label: 'Markets', value: markets.length, icon: MapPin },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Markets management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Farmers Markets</CardTitle>
              <Button size="sm" asChild>
                <Link href="/admin/markets/new">Add market</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {markets.map(market => (
                <div key={market.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-900">{market.name}</p>
                      {market.insurance_required && <Badge variant="warning" className="text-xs">Ins. req</Badge>}
                      {market.license_required && <Badge variant="info" className="text-xs">Lic. req</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">
                      {market.city}, {market.state}
                      {market.application_close_date && ` · Deadline: ${formatDateShort(market.application_close_date)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {market.website_url && (
                      <a href={market.website_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
                    )}
                    <Link href={`/admin/markets/${market.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
