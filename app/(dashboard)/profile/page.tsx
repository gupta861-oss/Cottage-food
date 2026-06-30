'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { ProducerProfile } from '@/types'
import { PRODUCTION_LOCATION_LABELS, SELLING_GOAL_LABELS } from '@/lib/utils'
import { User, Globe, MapPin, Save } from 'lucide-react'

const SELLING_GOALS_LIST = Object.entries(SELLING_GOAL_LABELS)
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProducerProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [sellingGoals, setSellingGoals] = useState<string[]>([])

  const { register, handleSubmit, reset, watch } = useForm<Partial<ProducerProfile>>()

  useEffect(() => {
    fetch('/api/producer-profile').then(r => r.json()).then(({ profile }) => {
      if (profile) {
        setProfile(profile)
        setSellingGoals(profile.selling_goals ?? [])
        reset(profile)
      }
    })
  }, [reset])

  const toggleGoal = (g: string) => {
    setSellingGoals(gs => gs.includes(g) ? gs.filter(x => x !== g) : [...gs, g])
  }

  const onSubmit = async (data: Partial<ProducerProfile>) => {
    setLoading(true)
    try {
      const method = profile ? 'PUT' : 'POST'
      const res = await fetch('/api/producer-profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, selling_goals: sellingGoals }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error()
      setProfile(json.profile)
      toast({ title: 'Profile saved' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
        <p className="text-gray-600 mt-1">Keep your business details up to date. This information is used on labels and application packets.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Owner Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="owner_name">Your name *</Label>
              <Input id="owner_name" {...register('owner_name')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="business_name">Business name</Label>
              <Input id="business_name" placeholder="Optional" {...register('business_name')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" type="tel" {...register('phone' as any)} />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="city">City *</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State *</Label>
              <select
                id="state"
                {...register('state')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP code</Label>
              <Input id="zip" {...register('zip')} />
            </div>
          </CardContent>
        </Card>

        {/* Production */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production & Business Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="production_location_type">Where do you make your products?</Label>
              <select
                id="production_location_type"
                {...register('production_location_type')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(PRODUCTION_LOCATION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="business_stage">Business stage</Label>
              <select
                id="business_stage"
                {...register('business_stage')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="new">New — just getting started</option>
                <option value="existing">Existing — already selling</option>
                <option value="unknown">Not sure</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Selling Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selling Goals</CardTitle>
            <CardDescription>Where do you want to sell your products?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {SELLING_GOALS_LIST.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={sellingGoals.includes(value)}
                  onCheckedChange={() => toggleGoal(value)}
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Online Presence */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Online Presence</CardTitle>
            <CardDescription>Optional — helps fill in market applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="website_url">Website URL</Label>
              <Input id="website_url" type="url" placeholder="https://yourbakery.com" {...register('website_url')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram_url">Instagram</Label>
              <Input id="instagram_url" placeholder="https://instagram.com/yourbakery" {...register('instagram_url')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebook_url">Facebook</Label>
              <Input id="facebook_url" placeholder="https://facebook.com/yourbakery" {...register('facebook_url')} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          {loading ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </div>
  )
}
