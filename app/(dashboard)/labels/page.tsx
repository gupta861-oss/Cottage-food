'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tag, AlertCircle, Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Product, Label as LabelType, ProducerProfile } from '@/types'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/utils'

const MN_REQUIRED_STATEMENT = 'Made in a home kitchen that has not been inspected by the Minnesota Department of Agriculture.'

export default function LabelsPage() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [profile, setProfile] = useState<ProducerProfile | null>(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [label, setLabel] = useState<Partial<LabelType>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/producer-profile').then(r => r.json()),
    ]).then(([pd, pr]) => {
      setProducts(pd.products ?? [])
      setProfile(pr.profile ?? null)
      const preselect = searchParams.get('product')
      if (preselect) setSelectedProductId(preselect)
      else if (pd.products?.[0]) setSelectedProductId(pd.products[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedProductId) return
    const product = products.find(p => p.id === selectedProductId)
    if (product) {
      setLabel(l => ({
        product_id: selectedProductId,
        ingredients: l.ingredients || product.ingredients || '',
        allergens: l.allergens || product.allergens || [],
        required_statement: l.required_statement || MN_REQUIRED_STATEMENT,
        ...l,
      }))
    }
    fetch(`/api/labels?productId=${selectedProductId}`)
      .then(r => r.json())
      .then(({ label }) => {
        if (label) setLabel(label)
        else {
          const product = products.find(p => p.id === selectedProductId)
          setLabel({
            product_id: selectedProductId,
            ingredients: product?.ingredients || '',
            allergens: product?.allergens || [],
            required_statement: MN_REQUIRED_STATEMENT,
            status: 'draft',
            business_name_or_registrant: profile
              ? (profile.business_name || profile.owner_name)
              : '',
            registration_number_or_address: profile
              ? `${profile.city}, ${profile.state}`
              : '',
          })
        }
      })
  }, [selectedProductId, products, profile])

  useEffect(() => {
    const m: string[] = []
    if (!label.business_name_or_registrant) m.push('Business / registrant name')
    if (!label.ingredients) m.push('Ingredients list')
    if (!label.required_statement) m.push('Required cottage food statement')
    if (!label.registration_number_or_address) m.push('Registration number or address')
    setMissing(m)
  }, [label])

  const generateLabelText = () => {
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return ''
    const parts: string[] = []
    parts.push(`PRODUCT NAME: ${product.name}`)
    if (label.business_name_or_registrant) parts.push(`Made by: ${label.business_name_or_registrant}`)
    if (label.registration_number_or_address) parts.push(`${label.registration_number_or_address}`)
    if (label.ingredients) parts.push(`INGREDIENTS: ${label.ingredients}`)
    if (label.allergens && label.allergens.length > 0) {
      parts.push(`CONTAINS: ${label.allergens.join(', ')}`)
    }
    if (label.net_weight) parts.push(`Net Weight: ${label.net_weight}`)
    if (label.date_made) parts.push(`Date Made: ${label.date_made}`)
    if (label.required_statement) parts.push(`\n${label.required_statement}`)
    if (label.contact_info) parts.push(`Contact: ${label.contact_info}`)
    return parts.join('\n')
  }

  const handleSave = async () => {
    if (!selectedProductId) return
    setSaving(true)
    try {
      const res = await fetch('/api/labels', {
        method: label.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...label,
          product_id: selectedProductId,
          label_text: generateLabelText(),
          status: missing.length === 0 ? 'ready_for_review' : 'draft',
        }),
      })
      const { label: saved } = await res.json()
      setLabel(saved)
      toast({ title: 'Label saved' })
    } catch {
      toast({ title: 'Failed to save label', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const copyLabel = () => {
    navigator.clipboard.writeText(generateLabelText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Label text copied to clipboard' })
  }

  const selectedProduct = products.find(p => p.id === selectedProductId)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Label Builder</h1>
        <p className="text-gray-600 mt-1">Create compliant labels for your cottage food products.</p>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">No products yet</h3>
            <p className="text-sm text-gray-500">Add products first to build their labels.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {PRODUCT_CATEGORY_LABELS[p.category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <>
                <div className="space-y-1.5">
                  <Label>Business / registrant name *</Label>
                  <Input
                    placeholder="Jane's Baked Goods"
                    value={label.business_name_or_registrant ?? ''}
                    onChange={e => setLabel(l => ({ ...l, business_name_or_registrant: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Registration number or address *</Label>
                  <Input
                    placeholder="MN Reg. #12345 or 123 Main St, Minneapolis MN 55401"
                    value={label.registration_number_or_address ?? ''}
                    onChange={e => setLabel(l => ({ ...l, registration_number_or_address: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Ingredients *</Label>
                  <Textarea
                    placeholder="Flour, butter, sugar, eggs, chocolate chips, vanilla extract, salt, baking soda"
                    value={label.ingredients ?? ''}
                    onChange={e => setLabel(l => ({ ...l, ingredients: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Allergen statement</Label>
                  <Input
                    placeholder="Contains: Wheat, Eggs, Milk"
                    value={label.allergens?.join(', ') ?? ''}
                    onChange={e => setLabel(l => ({ ...l, allergens: e.target.value.split(',').map(a => a.trim()).filter(Boolean) }))}
                  />
                  <p className="text-xs text-gray-400">Comma-separated list of allergens</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Net weight (optional)</Label>
                  <Input
                    placeholder="12 oz (340g)"
                    value={label.net_weight ?? ''}
                    onChange={e => setLabel(l => ({ ...l, net_weight: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Date made</Label>
                  <Input
                    type="date"
                    value={label.date_made ?? ''}
                    onChange={e => setLabel(l => ({ ...l, date_made: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Required cottage food statement</Label>
                  <Textarea
                    value={label.required_statement ?? ''}
                    onChange={e => setLabel(l => ({ ...l, required_statement: e.target.value }))}
                    rows={2}
                  />
                  <p className="text-xs text-gray-400">This statement is required on Minnesota cottage food products</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Contact info (optional)</Label>
                  <Input
                    placeholder="jane@example.com or (612) 555-1234"
                    value={label.contact_info ?? ''}
                    onChange={e => setLabel(l => ({ ...l, contact_info: e.target.value }))}
                  />
                </div>

                {missing.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Missing required fields</span>
                    </div>
                    <ul className="space-y-1">
                      {missing.map(m => <li key={m} className="text-xs text-yellow-700">• {m}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? 'Saving…' : 'Save label'}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Label Preview</h2>
              {label.status && (
                <Badge variant={
                  label.status === 'complete' ? 'success' :
                  label.status === 'ready_for_review' ? 'info' :
                  label.status === 'missing_info' ? 'destructive' : 'secondary'
                }>
                  {label.status?.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-white min-h-64 font-mono text-sm">
              {selectedProduct ? (
                <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed text-xs">
                  {generateLabelText() || 'Fill in the fields to see your label preview'}
                </pre>
              ) : (
                <div className="text-center text-gray-400 py-8">Select a product to preview its label</div>
              )}
            </div>

            {selectedProduct && (
              <Button variant="outline" onClick={copyLabel} className="w-full gap-2">
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy label text'}
              </Button>
            )}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Important:</strong> This label preview is a starting point. Always review the official cottage food labeling requirements for your state before printing. This tool does not guarantee legal compliance.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
