import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (session.data.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const userId = getRouterParam(event, 'userId')
  if (!userId) throw createError({ statusCode: 400, message: 'User ID required' })

  const body = await readBody(event)
  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (body.username?.trim()) updates.username = body.username.trim()
  if (body.role === 'admin' || body.role === 'viewer') updates.role = body.role
  if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 12)

  const db = useDB()
  const [user] = await db.update(users).set(updates).where(eq(users.id, userId))
    .returning({ id: users.id, username: users.username, role: users.role, createdAt: users.createdAt })

  if (!user) throw createError({ statusCode: 404, message: 'User not found' })
  return user
})
