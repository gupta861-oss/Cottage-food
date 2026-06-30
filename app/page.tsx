import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, FileText, MapPin, Package, ShieldCheck, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">Cottage Food Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Get started free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Built for cottage food and small-batch producers
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Get farmers-market-ready from one place
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Tell us what you sell. Get your personalized checklist, product labels, document vault,
            and farmers market application packet — all in one guided workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-base px-8">
                Start your readiness check
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base px-8">
                I already have an account
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">Free to start. No credit card required.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-lg text-gray-600">Answer a few questions and we build your personalized plan</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Tell us what you sell',
                description: 'Add your business info, products, and where you want to sell — at farmers markets, online, from home, or all three.',
                icon: Package,
              },
              {
                step: '2',
                title: 'Get your readiness plan',
                description: 'We generate a personalized checklist based on your state, product type, and selling goals. No guesswork.',
                icon: CheckCircle,
              },
              {
                step: '3',
                title: 'Prepare everything in one place',
                description: 'Create labels, organize documents, generate your market application packet, and track deadlines.',
                icon: FileText,
              },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-sm font-semibold text-primary mb-1">Step {item.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to start selling</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: CheckCircle,
                title: 'Personalized Readiness Checklist',
                description: 'Your checklist is generated based on your state, product type, production location, and selling goals — not a generic list.',
              },
              {
                icon: FileText,
                title: 'Label Builder',
                description: 'Create compliant product labels with required fields for cottage food. Preview, review, and export.',
              },
              {
                icon: ShieldCheck,
                title: 'Document Vault',
                description: 'Store your registration, training certificate, insurance, photos, and application materials in one organized place.',
              },
              {
                icon: MapPin,
                title: 'Farmers Market Directory',
                description: 'Browse local markets, track application deadlines, and see what requirements you still need to meet.',
              },
              {
                icon: Sparkles,
                title: 'Application Packet Generator',
                description: 'Generate a reusable vendor bio, product descriptions, and booth info you can submit to multiple markets.',
              },
              {
                icon: Package,
                title: 'Product Catalog',
                description: 'Manage all your products with ingredients, allergens, pricing, and label status in one place.',
              },
            ].map(feature => (
              <div key={feature.title} className="flex gap-4 p-6 bg-white rounded-xl border">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for producers like you</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-brand-50 rounded-2xl p-8">
              <div className="text-3xl mb-4">🍪</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">New to selling</h3>
              <p className="text-gray-700 mb-4 leading-relaxed">
                "I bake cookies at home and want to sell at farmers markets — where do I start?"
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Get step-by-step registration guidance</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Find training requirements for your state</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Create your first compliant label</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Research markets and track deadlines</li>
              </ul>
            </div>
            <div className="bg-green-50 rounded-2xl p-8">
              <div className="text-3xl mb-4">🧁</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Already selling</h3>
              <p className="text-gray-700 mb-4 leading-relaxed">
                "I sell at three markets but my documents are scattered everywhere."
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Store and track all documents in one vault</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Get alerts before insurance expires</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Reuse application materials across markets</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Manage your product catalog and labels</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Answer a few questions about what you sell and we'll build your personalized readiness plan.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base px-10">
              Start your readiness check — it's free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p className="mb-2">
            Cottage Food Portal helps producers prepare — not provide legal advice. Always review official state and local requirements.
          </p>
          <p>© {new Date().getFullYear()} Cottage Food Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
