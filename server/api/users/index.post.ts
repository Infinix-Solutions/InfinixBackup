import bcrypt from 'bcryptjs'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (session.data.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  if (!body.username?.trim() || !body.password) {
    throw createError({ statusCode: 400, message: 'Username and password required' })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  const db = useDB()

  const [user] = await db.insert(users).values({
    username: body.username.trim(),
    passwordHash,
    role: body.role === 'admin' ? 'admin' : 'viewer'
  }).returning({ id: users.id, username: users.username, role: users.role, createdAt: users.createdAt })

  setResponseStatus(event, 201)
  return user
})
