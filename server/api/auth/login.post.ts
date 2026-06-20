import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.username || !body.password) {
    throw createError({ statusCode: 400, message: 'Username and password required' })
  }

  const db = useDB()
  const user = await db.query.users.findFirst({
    where: eq(users.username, body.username.trim())
  })

  if (!user || !await bcrypt.compare(body.password, user.passwordHash)) {
    throw createError({ statusCode: 401, message: 'Invalid username or password' })
  }

  const session = await getAuthSession(event)
  await session.update({ userId: user.id, username: user.username, role: user.role })

  return { id: user.id, username: user.username, role: user.role }
})
