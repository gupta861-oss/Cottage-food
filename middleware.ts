import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/onboarding', '/admin']
const AUTH_PATHS = ['/login', '/register']

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  const isAuth = AUTH_PATHS.some(p => pathname.startsWith(p))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuth && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
