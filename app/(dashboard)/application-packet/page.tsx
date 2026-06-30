'use client'

import { useEffect, useState } from 'react'
import { FileText, RefreshCw, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { ApplicationPacket } from '@/types'

export default function ApplicationPacketPage() {
  const [packet, setPacket] = useState<ApplicationPacket | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/application-packet')
    const { packet } = await res.json()
    setPacket(packet)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generate = async () => {
    setGenerating(true)
    const res = await fetch('/api/application-packet', { method: 'POST' })
    const { packet } = await res.json()
    setPacket(packet)
    setGenerating(false)
    toast({ title: 'Application packet generated' })
  }

  const save = async () => {
    if (!packet) return
    setSaving(true)
    try {
      const res = await fetch('/api/application-packet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet),
      })
      const { packet: saved } = await res.json()
      setPacket(saved)
      toast({ title: 'Packet saved' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const copyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
    toast({ title: 'Copied to clipboard' })
  }

  const copyAll = () => {
    if (!packet) return
    const text = [
      'VENDOR BIO\n' + packet.vendor_bio,
      'BUSINESS DESCRIPTION\n' + packet.business_description,
      'PRODUCT DESCRIPTIONS\n' + packet.product_descriptions,
      'BOOTH DESCRIPTION\n' + packet.booth_description,
    ].filter(Boolean).join('\n\n---\n\n')
    navigator.clipboard.writeText(text)
    toast({ title: 'Full packet copied to clipboard' })
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Packet</h1>
          <p className="text-gray-600 mt-1">Reusable materials for farmers market applications. Generate once, use everywhere.</p>
        </div>
        <div className="flex gap-2">
          {packet && (
            <Button variant="outline" onClick={copyAll} className="gap-2">
              <Copy className="w-4 h-4" /> Copy all
            </Button>
          )}
          <Button onClick={generate} disabled={generating} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {packet ? 'Regenerate' : 'Generate packet'}
          </Button>
        </div>
      </div>

      {!packet ? (
        <Card>
          <CardContent className="py-20 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate your application packet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We'll create a vendor bio, product descriptions, and booth description based on your profile.
              Review and edit to make it your own.
            </p>
            <Button onClick={generate} size="lg" disabled={generating}>
              {generating ? 'Generating…' : 'Generate my packet'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Badge variant={packet.status === 'ready_for_review' ? 'success' : 'secondary'}>
              {packet.status?.replace(/_/g, ' ')}
            </Badge>
            <span className="text-sm text-gray-500">Edit any section below, then save your changes.</span>
          </div>

          <div className="space-y-5">
            {[
              { field: 'vendor_bio', label: 'Vendor Bio', description: 'A personal introduction to your business. Markets often display this alongside your booth.', rows: 4 },
              { field: 'business_description', label: 'Business Description', description: 'A brief overview of your business for applications.', rows: 3 },
              { field: 'product_descriptions', label: 'Product Descriptions', description: 'Descriptions of your products. One per paragraph works well.', rows: 5 },
              { field: 'booth_description', label: 'Booth / Display Description', description: 'Describe how you set up and present your products at market.', rows: 3 },
            ].map(({ field, label, description, rows }) => (
              <Card key={field}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{label}</CardTitle>
                      <CardDescription className="mt-0.5">{description}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyField((packet as any)[field] ?? '', field)}
                      className="gap-1.5"
                    >
                      {copied === field
                        ? <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Copied</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy</>
                      }
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={rows}
                    value={(packet as any)[field] ?? ''}
                    onChange={e => setPacket(p => p ? { ...p, [field]: e.target.value } : p)}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <strong>Tip:</strong> These materials are designed to be customized. After generating, read through each section and add personal touches. Markets respond better to authentic, specific applications than generic text.
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>This portal does not submit applications on your behalf. You will need to apply directly to each market using these materials.</span>
          </div>

          <div className="flex gap-3">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={copyAll} className="gap-2">
              <Copy className="w-4 h-4" /> Copy full packet
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
