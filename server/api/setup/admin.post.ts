import { count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.username?.trim() || !body.password) {
    throw createError({ statusCode: 400, message: 'Username and password required' })
  }

  if (body.password.length < 8) {
    throw createError({ statusCode: 400, message: 'Password must be at least 8 characters' })
  }

  const db = useDB()
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(users)
  if (total > 0) {
    throw createError({ statusCode: 409, message: 'Admin account already exists' })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  const [user] = await db.insert(users).values({
    username: body.username.trim(),
    passwordHash,
    role: 'admin'
  }).returning({ id: users.id, username: users.username, role: users.role })

  if (!user) throw createError({ statusCode: 500, message: 'Failed to create user' })

  const session = await getAuthSession(event)
  await session.update({ userId: user.id, username: user.username, role: user.role })

  setResponseStatus(event, 201)
  return { id: user.id, username: user.username, role: user.role }
})
