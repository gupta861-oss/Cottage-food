'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

const STEPS = ['Business Basics', 'Products', 'Selling Goals', 'Current Status', 'Review']

const PRODUCTION_LOCATIONS = [
  { value: 'home', label: 'Home kitchen' },
  { value: 'commercial_kitchen', label: 'Commercial kitchen' },
  { value: 'shared_kitchen', label: 'Shared / rental kitchen' },
  { value: 'farm', label: 'Farm' },
  { value: 'other', label: 'Other' },
]

const SELLING_GOALS = [
  { value: 'farmers_markets', label: 'Farmers markets' },
  { value: 'community_events', label: 'Community events' },
  { value: 'from_home', label: 'From home / direct sales' },
  { value: 'online_delivery', label: 'Online / local delivery' },
  { value: 'cafes', label: 'Cafes' },
  { value: 'retail', label: 'Retail stores' },
  { value: 'not_sure', label: "Not sure yet" },
]

const PRODUCT_CATEGORIES = [
  { value: 'baked_goods', label: 'Baked goods' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'jam_jelly', label: 'Jam / Jelly' },
  { value: 'candy', label: 'Candy' },
  { value: 'granola', label: 'Granola' },
  { value: 'frozen_food', label: 'Frozen food' },
  { value: 'beverage_coffee', label: 'Beverage / Coffee' },
  { value: 'skincare_body_care', label: 'Skincare / Body care' },
  { value: 'soap', label: 'Soap' },
  { value: 'other', label: 'Other' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const [business, setBusiness] = useState({
    business_name: '',
    owner_name: '',
    city: '',
    state: 'MN',
    business_stage: 'new' as 'new' | 'existing',
    production_location_type: 'home',
    sells_now: false,
  })

  const [product, setProduct] = useState({
    name: '',
    category: 'baked_goods',
    is_food: true,
    shelf_stable: true,
    requires_refrigeration: false,
    allergens: [] as string[],
    ingredients: '',
    description: '',
  })

  const [sellingGoals, setSellingGoals] = useState<string[]>(['farmers_markets'])

  const [currentStatus, setCurrentStatus] = useState({
    has_cottage_food_registration: false,
    has_food_safety_training: false,
    has_business_registration: false,
    has_insurance: false,
    has_product_labels: false,
    has_product_photos: false,
  })

  const handleAiParse = async () => {
    if (!aiInput.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiInput }),
      })
      const { parsed } = await res.json()
      if (parsed.product_category) setProduct(p => ({ ...p, category: parsed.product_category }))
      if (parsed.production_location) setBusiness(b => ({ ...b, production_location_type: parsed.production_location }))
      if (parsed.selling_channels?.length) setSellingGoals(parsed.selling_channels)
      if (parsed.products?.[0]) setProduct(p => ({ ...p, name: parsed.products[0] }))
      toast({ title: 'Information extracted', description: 'Review and adjust the pre-filled fields below.' })
    } catch {
      toast({ title: 'Could not parse description', description: 'Please fill in the fields manually.', variant: 'destructive' })
    } finally {
      setAiLoading(false)
    }
  }

  const toggleAllergen = (a: string) => {
    setProduct(p => ({
      ...p,
      allergens: p.allergens.includes(a) ? p.allergens.filter(x => x !== a) : [...p.allergens, a],
    }))
  }

  const toggleGoal = (g: string) => {
    setSellingGoals(gs => gs.includes(g) ? gs.filter(x => x !== g) : [...gs, g])
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Create producer profile
      const profileRes = await fetch('/api/producer-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...business,
          selling_goals: sellingGoals,
        }),
      })
      const { profile } = await profileRes.json()
      if (!profileRes.ok) throw new Error('Failed to create profile')

      // Create product
      if (product.name) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        })
      }

      // Create documents for existing items
      const docTypes = [
        { key: 'has_cottage_food_registration', type: 'cottage_food_registration', name: 'Cottage Food Registration' },
        { key: 'has_food_safety_training', type: 'food_safety_training', name: 'Food Safety Training Certificate' },
        { key: 'has_business_registration', type: 'business_registration', name: 'Business Registration / DBA' },
        { key: 'has_insurance', type: 'insurance_certificate', name: 'Insurance Certificate' },
        { key: 'has_product_labels', type: 'label', name: 'Product Label' },
        { key: 'has_product_photos', type: 'product_photo', name: 'Product Photo' },
      ]

      for (const dt of docTypes) {
        if ((currentStatus as any)[dt.key]) {
          await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              document_type: dt.type,
              file_name: dt.name,
              status: 'active',
            }),
          })
        }
      }

      // Generate checklist
      await fetch('/api/checklist', { method: 'POST' })

      router.push('/dashboard')
    } catch (err) {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">Cottage Food Portal</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
                  i < step ? 'bg-primary text-white' :
                  i === step ? 'bg-primary text-white' :
                  'bg-gray-200 text-gray-500'
                )}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-2 w-8', i < step ? 'bg-primary' : 'bg-gray-200')} />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">Step {step + 1} of {STEPS.length}: <span className="font-medium text-gray-900">{STEPS[step]}</span></p>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          {/* Step 0: Business Basics */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Tell us about your business</h2>
                <p className="text-gray-600 text-sm">We'll use this to personalize your readiness plan.</p>
              </div>

              {/* AI quick start */}
              <div className="bg-brand-50 rounded-lg p-4 border border-brand-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-gray-900">Quick start</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">Describe what you make and where you want to sell — we'll pre-fill the form.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder='e.g. "I bake cookies at home in Minneapolis and want to sell at farmers markets"'
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={handleAiParse} disabled={aiLoading}>
                    {aiLoading ? '…' : 'Parse'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="owner_name">Your name *</Label>
                  <Input
                    id="owner_name"
                    placeholder="Jane Smith"
                    value={business.owner_name}
                    onChange={e => setBusiness(b => ({ ...b, owner_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_name">Business name (optional)</Label>
                  <Input
                    id="business_name"
                    placeholder="Jane's Baked Goods"
                    value={business.business_name}
                    onChange={e => setBusiness(b => ({ ...b, business_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Minneapolis"
                    value={business.city}
                    onChange={e => setBusiness(b => ({ ...b, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State *</Label>
                  <select
                    id="state"
                    value={business.state}
                    onChange={e => setBusiness(b => ({ ...b, state: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Where do you make your products? *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCTION_LOCATIONS.map(loc => (
                    <button
                      key={loc.value}
                      type="button"
                      onClick={() => setBusiness(b => ({ ...b, production_location_type: loc.value }))}
                      className={cn(
                        'text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                        business.production_location_type === loc.value
                          ? 'border-primary bg-brand-50 text-primary font-medium'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Are you new to selling or already selling?</Label>
                <div className="flex gap-3">
                  {[
                    { value: 'new', label: "I'm new — just getting started" },
                    { value: 'existing', label: "I already sell" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBusiness(b => ({ ...b, business_stage: opt.value as 'new' | 'existing', sells_now: opt.value === 'existing' }))}
                      className={cn(
                        'flex-1 px-3 py-2.5 rounded-lg border text-sm transition-colors text-left',
                        business.business_stage === opt.value
                          ? 'border-primary bg-brand-50 text-primary font-medium'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Products */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Tell us about your first product</h2>
                <p className="text-gray-600 text-sm">You can add more products later on your dashboard.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product_name">Product name *</Label>
                <Input
                  id="product_name"
                  placeholder="Chocolate chip cookies"
                  value={product.name}
                  onChange={e => setProduct(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Product category *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setProduct(p => ({ ...p, category: cat.value }))}
                      className={cn(
                        'text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                        product.category === cat.value
                          ? 'border-primary bg-brand-50 text-primary font-medium'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Product details</Label>
                <div className="space-y-2">
                  {[
                    { key: 'is_food', label: 'This is a food product (not a craft or body care item)' },
                    { key: 'shelf_stable', label: 'It is shelf-stable (no refrigeration required at room temperature)' },
                    { key: 'requires_refrigeration', label: 'It requires refrigeration' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={(product as any)[item.key]}
                        onCheckedChange={v => setProduct(p => ({ ...p, [item.key]: !!v }))}
                      />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Does it contain any of these allergens?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Peanuts', 'Tree nuts', 'Milk / Dairy', 'Eggs', 'Wheat / Gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame'].map(a => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={product.allergens.includes(a)}
                        onCheckedChange={() => toggleAllergen(a)}
                      />
                      <span className="text-sm text-gray-700">{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ingredients">Ingredients (optional)</Label>
                <Textarea
                  id="ingredients"
                  placeholder="Flour, butter, sugar, eggs, chocolate chips, vanilla extract, salt, baking soda"
                  value={product.ingredients}
                  onChange={e => setProduct(p => ({ ...p, ingredients: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Selling Goals */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Where do you want to sell?</h2>
                <p className="text-gray-600 text-sm">Select all that apply. This helps us tailor your readiness checklist.</p>
              </div>
              <div className="space-y-2">
                {SELLING_GOALS.map(goal => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => toggleGoal(goal.value)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors flex items-center gap-3',
                      sellingGoals.includes(goal.value)
                        ? 'border-primary bg-brand-50 text-primary font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center shrink-0',
                      sellingGoals.includes(goal.value) ? 'bg-primary border-primary' : 'border-gray-300'
                    )}>
                      {sellingGoals.includes(goal.value) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {goal.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Current Status */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">What do you already have?</h2>
                <p className="text-gray-600 text-sm">Check off anything you already have in place. We'll skip those in your checklist.</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'has_cottage_food_registration', label: 'Cottage food registration / license', desc: 'Official registration with your state' },
                  { key: 'has_food_safety_training', label: 'Food safety training certificate', desc: 'Approved course completion certificate' },
                  { key: 'has_business_registration', label: 'Business registration / DBA', desc: 'Official business name registration' },
                  { key: 'has_insurance', label: 'Vendor / product liability insurance', desc: 'Certificate of Insurance (COI)' },
                  { key: 'has_product_labels', label: 'Compliant product labels', desc: 'Labels meeting cottage food requirements' },
                  { key: 'has_product_photos', label: 'Product photos', desc: 'Clear photos for applications and sales' },
                ].map(item => (
                  <label
                    key={item.key}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      (currentStatus as any)[item.key] ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Checkbox
                      checked={(currentStatus as any)[item.key]}
                      onCheckedChange={v => setCurrentStatus(s => ({ ...s, [item.key]: !!v }))}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Review your information</h2>
                <p className="text-gray-600 text-sm">Everything look right? We'll generate your personalized readiness plan.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Business</div>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Name:</span> {business.owner_name}</p>
                    {business.business_name && <p><span className="font-medium">Business:</span> {business.business_name}</p>}
                    <p><span className="font-medium">Location:</span> {business.city}, {business.state}</p>
                    <p><span className="font-medium">Production:</span> {PRODUCTION_LOCATIONS.find(l => l.value === business.production_location_type)?.label}</p>
                    <p><span className="font-medium">Stage:</span> {business.business_stage === 'new' ? 'New producer' : 'Already selling'}</p>
                  </div>
                </div>

                {product.name && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product</div>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Product:</span> {product.name}</p>
                      <p><span className="font-medium">Category:</span> {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label}</p>
                      {product.allergens.length > 0 && <p><span className="font-medium">Allergens:</span> {product.allergens.join(', ')}</p>}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Selling Goals</div>
                  <div className="text-sm">
                    {sellingGoals.map(g => SELLING_GOALS.find(sg => sg.value === g)?.label).join(', ')}
                  </div>
                </div>

                <div className="p-4 bg-brand-50 rounded-lg border border-brand-100">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> This portal helps you prepare and organize — it does not provide legal advice and does not guarantee compliance or market acceptance. Always review official state and local requirements before submitting anything.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !business.owner_name}
              className="flex items-center gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
              {loading ? 'Creating your plan…' : 'Generate my readiness plan'} <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
