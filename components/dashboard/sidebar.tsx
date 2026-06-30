'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Package, LayoutDashboard, User, ShoppingBag, FileText,
  FolderOpen, CheckSquare, MapPin, Bookmark, LogOut, Settings, Tag
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Business Profile', icon: User },
  { href: '/products', label: 'Products', icon: ShoppingBag },
  { href: '/labels', label: 'Label Builder', icon: Tag },
  { href: '/documents', label: 'Document Vault', icon: FolderOpen },
  { href: '/checklist', label: 'Readiness Checklist', icon: CheckSquare },
  { href: '/application-packet', label: 'Application Packet', icon: FileText },
  { href: '/markets', label: 'Market Directory', icon: MapPin },
  { href: '/saved-markets', label: 'My Markets', icon: Bookmark },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    toast({ title: 'Logged out successfully' })
  }

  return (
    <aside className="w-60 bg-white border-r min-h-screen flex flex-col shrink-0">
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm leading-tight">Cottage Food<br />Portal</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-brand-50 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t space-y-0.5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </aside>
  )
}
