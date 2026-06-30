'use client'

import { useEffect, useState } from 'react'
import { Plus, FolderOpen, AlertCircle, Clock, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { Document, DocumentType, DocumentStatus } from '@/types'
import { DOCUMENT_TYPE_LABELS, formatDate, isExpiringSoon, isExpired, cn } from '@/lib/utils'

const DOC_TYPES = Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]

const statusColor = (status: DocumentStatus) => ({
  active: 'success',
  expired: 'destructive',
  missing: 'warning',
  needs_review: 'warning',
} as const)[status] ?? 'muted'

const statusIcon = (status: DocumentStatus, expDate?: string) => {
  if (isExpired(expDate)) return <AlertCircle className="w-4 h-4 text-red-500" />
  if (isExpiringSoon(expDate)) return <Clock className="w-4 h-4 text-yellow-500" />
  if (status === 'active') return <CheckCircle className="w-4 h-4 text-green-500" />
  return <AlertCircle className="w-4 h-4 text-gray-400" />
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    document_type: 'cottage_food_registration' as DocumentType,
    file_name: '',
    status: 'active' as DocumentStatus,
    issued_date: '',
    expiration_date: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/documents').then(r => r.json()).then(({ documents }) => setDocs(documents ?? []))
  }

  useEffect(() => { load() }, [])

  const openAdd = (presetType?: DocumentType) => {
    setFormData({
      document_type: presetType ?? 'cottage_food_registration',
      file_name: '',
      status: 'active',
      issued_date: '',
      expiration_date: '',
      notes: '',
    })
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Document added' })
      setOpen(false)
      load()
    } catch {
      toast({ title: 'Failed to add document', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this document?')) return
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    toast({ title: 'Document removed' })
    load()
  }

  const handleStatusUpdate = async (id: string, status: DocumentStatus) => {
    await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setDocs(docs => docs.map(d => d.id === id ? { ...d, status } : d))
  }

  const expiredDocs = docs.filter(d => isExpired(d.expiration_date))
  const expiringSoon = docs.filter(d => isExpiringSoon(d.expiration_date))

  const CATEGORIES = [
    { id: 'all', label: 'All documents' },
    { id: 'compliance', label: 'Compliance', types: ['cottage_food_registration', 'food_safety_training'] },
    { id: 'insurance_business', label: 'Insurance & Business', types: ['insurance_certificate', 'business_registration'] },
    { id: 'products', label: 'Products & Labels', types: ['label', 'product_photo', 'menu'] },
    { id: 'markets', label: 'Market Applications', types: ['booth_photo', 'application_pdf', 'other'] },
  ]

  const filterDocs = (cat: typeof CATEGORIES[0]) => {
    if (cat.id === 'all') return docs
    return docs.filter(d => (cat.types as string[]).includes(d.document_type))
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Vault</h1>
          <p className="text-gray-600 mt-1">Store, organize, and track all your business documents in one place.</p>
        </div>
        <Button onClick={() => openAdd()} className="gap-2">
          <Plus className="w-4 h-4" /> Add document
        </Button>
      </div>

      {/* Alerts */}
      {(expiredDocs.length > 0 || expiringSoon.length > 0) && (
        <div className="mb-6 space-y-2">
          {expiredDocs.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-800"><strong>{d.file_name}</strong> expired on {formatDate(d.expiration_date!)}</p>
              <Button size="sm" variant="outline" className="ml-auto border-red-300 text-red-700 text-xs" onClick={() => openAdd(d.document_type)}>
                Update
              </Button>
            </div>
          ))}
          {expiringSoon.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800"><strong>{d.file_name}</strong> expires soon: {formatDate(d.expiration_date!)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick add empty slots */}
      {docs.length === 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {['cottage_food_registration', 'food_safety_training', 'insurance_certificate', 'business_registration'].map(type => (
            <button
              key={type}
              onClick={() => openAdd(type as DocumentType)}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary/30 hover:bg-brand-50/50 transition-colors text-left"
            >
              <Plus className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Add {DOCUMENT_TYPE_LABELS[type as DocumentType]}</p>
                <p className="text-xs text-gray-400">Click to upload</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">No documents yet</h3>
            <p className="text-sm text-gray-500">Add your registration, training, and insurance documents to track them here.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap h-auto gap-1 mb-4">
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                {cat.label}
                <span className="ml-1.5 bg-gray-200 text-gray-700 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                  {filterDocs(cat).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.id} value={cat.id}>
              <div className="space-y-3">
                {filterDocs(cat).length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No documents in this category</div>
                ) : (
                  filterDocs(cat).map(doc => (
                    <Card key={doc.id}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className="mt-0.5">
                          {statusIcon(doc.status, doc.expiration_date)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900">{doc.file_name}</h3>
                            <Badge variant="muted" className="text-xs">{DOCUMENT_TYPE_LABELS[doc.document_type]}</Badge>
                            <Badge variant={statusColor(
                              isExpired(doc.expiration_date) ? 'expired' : doc.status
                            ) as any} className="text-xs">
                              {isExpired(doc.expiration_date) ? 'expired' :
                               isExpiringSoon(doc.expiration_date) ? 'expiring soon' :
                               doc.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-1">
                            {doc.issued_date && (
                              <p className="text-xs text-gray-500">Issued: {formatDate(doc.issued_date)}</p>
                            )}
                            {doc.expiration_date && (
                              <p className={cn(
                                'text-xs',
                                isExpired(doc.expiration_date) ? 'text-red-600 font-medium' :
                                isExpiringSoon(doc.expiration_date) ? 'text-yellow-600 font-medium' :
                                'text-gray-500'
                              )}>
                                Expires: {formatDate(doc.expiration_date)}
                              </p>
                            )}
                          </div>
                          {doc.notes && <p className="text-xs text-gray-400 mt-1">{doc.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={doc.status}
                            onChange={e => handleStatusUpdate(doc.id, e.target.value as DocumentStatus)}
                            className="text-xs rounded border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="needs_review">Needs review</option>
                            <option value="missing">Missing</option>
                          </select>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Document type</Label>
              <Select
                value={formData.document_type}
                onValueChange={v => setFormData(f => ({ ...f, document_type: v as DocumentType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Document name / description *</Label>
              <Input
                placeholder="e.g. MN Cottage Food Registration 2025"
                value={formData.file_name}
                onChange={e => setFormData(f => ({ ...f, file_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v as DocumentStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="needs_review">Needs review</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Issue date</Label>
                <Input type="date" value={formData.issued_date} onChange={e => setFormData(f => ({ ...f, issued_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiration date</Label>
                <Input type="date" value={formData.expiration_date} onChange={e => setFormData(f => ({ ...f, expiration_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !formData.file_name}>
              {saving ? 'Saving…' : 'Add document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
