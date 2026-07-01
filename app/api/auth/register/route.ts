import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/store'
import { signToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    const user = await createUser(data.email, data.name, data.password)
    const token = await signToken({ userId: user.id, email: user.email, role: user.role })

    const res = NextResponse.json({ user }, { status: 201 })
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (err: any) {
    if (err?.message === 'Email already in use') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    if (err?.name === 'ZodError') {
      const firstIssue = err.issues?.[0]?.message ?? 'Invalid input'
      return NextResponse.json({ error: firstIssue }, { status: 400 })
    }
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Something went wrong creating your account. Please try again.' }, { status: 500 })
  }
}
