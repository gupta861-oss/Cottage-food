import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { User } from '@/types'
import { findUserById } from './store'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'cottage-food-portal-secret-key-change-in-production'
)

export async function signToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string; email: string; role: string }
  } catch {
    return null
  }
}

export async function getSession(): Promise<{ user: User } | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await findUserById(payload.userId)
  if (!user) return null

  return { user }
}

export async function getSessionFromRequest(req: NextRequest): Promise<{ user: User } | null> {
  const token = req.cookies.get('auth-token')?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await findUserById(payload.userId)
  if (!user) return null

  return { user }
}
