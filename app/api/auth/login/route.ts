import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, verifyPassword } from '@/lib/store'
import { signToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    const user = await findUserByEmail(data.email)
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const valid = await verifyPassword(user.id, data.password)
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const token = await signToken({ userId: user.id, email: user.email, role: user.role })
    const res = NextResponse.json({ user })
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
