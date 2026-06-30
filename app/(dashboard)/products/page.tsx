'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, Package, ChevronRight, Tag } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { Product } from '@/types'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/utils'

const ALLERGENS = ['Peanuts', 'Tree nuts', 'Milk / Dairy', 'Eggs', 'Wheat / Gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame']
const CATEGORIES = Object.entries(PRODUCT_CATEGORY_LABELS)

const emptyProduct: Omit<Product, 'id' | 'producer_profile_id' | 'created_at' | 'updated_at'> = {
  name: '', category: 'baked_goods', is_food: true, shelf_stable: true,
  requires_refrigeration: false, requires_freezing: false,
  ingredients: '', allergens: [], packaging_type: '',
  price: undefined, production_volume: '', description: '',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [formData, setFormData] = useState({ ...emptyProduct })
  const [allergens, setAllergens] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch('/api/products')
    const { products } = await res.json()
    setProducts(products ?? [])
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setFormData({ ...emptyProduct })
    setAllergens([])
    setOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setFormData({ ...p })
    setAllergens(p.allergens ?? [])
    setOpen(true)
  }

  const toggleAllergen = (a: string) => {
    setAllergens(as => as.includes(a) ? as.filter(x => x !== a) : [...as, a])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = { ...formData, allergens }
      const res = editing
        ? await fetch(`/api/products/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      if (!res.ok) throw new Error()
      toast({ title: editing ? 'Product updated' : 'Product added' })
      setOpen(false)
      load()
    } catch {
      toast({ title: 'Failed to save product', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    toast({ title: 'Product deleted' })
    load()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog, ingredients, and allergen information.</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add product
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">No products yet</h3>
            <p className="text-sm text-gray-500 mb-4">Add your first product to get started</p>
            <Button onClick={openCreate}>Add first product</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map(p => (
            <Card key={p.id}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <Badge variant="secondary" className="text-xs">{PRODUCT_CATEGORY_LABELS[p.category]}</Badge>
                    {p.shelf_stable && <Badge variant="success" className="text-xs">Shelf stable</Badge>}
                    {p.requires_refrigeration && <Badge variant="warning" className="text-xs">Refrigeration needed</Badge>}
                  </div>
                  {p.description && <p className="text-sm text-gray-600 mt-1">{p.description}</p>}
                  {p.allergens && p.allergens.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠ Contains: {p.allergens.join(', ')}
                    </p>
                  )}
                  {p.ingredients && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                      Ingredients: {p.ingredients}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/labels?product=${p.id}`}>
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      <Tag className="w-3 h-3" /> Label
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit product' : 'Add new product'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product name *</Label>
              <Input
                placeholder="Chocolate chip cookies"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value as any }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="A short description for market applications"
                value={formData.description ?? ''}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Product details</Label>
              {[
                { key: 'is_food', label: 'This is a food product' },
                { key: 'shelf_stable', label: 'Shelf stable (no refrigeration needed)' },
                { key: 'requires_refrigeration', label: 'Requires refrigeration' },
                { key: 'requires_freezing', label: 'Requires freezing' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={(formData as any)[item.key]}
                    onCheckedChange={v => setFormData(f => ({ ...f, [item.key]: !!v }))}
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Ingredients</Label>
              <Textarea
                placeholder="Flour, butter, sugar, eggs, chocolate chips, vanilla, salt, baking soda"
                value={formData.ingredients ?? ''}
                onChange={e => setFormData(f => ({ ...f, ingredients: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Allergens</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {ALLERGENS.map(a => (
                  <label key={a} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={allergens.includes(a)}
                      onCheckedChange={() => toggleAllergen(a)}
                    />
                    <span className="text-xs text-gray-700">{a}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price ?? ''}
                  onChange={e => setFormData(f => ({ ...f, price: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Packaging type</Label>
                <Input
                  placeholder="e.g. cellophane bag"
                  value={formData.packaging_type ?? ''}
                  onChange={e => setFormData(f => ({ ...f, packaging_type: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? 'Saving…' : editing ? 'Update product' : 'Add product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
