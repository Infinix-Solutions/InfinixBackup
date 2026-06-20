import { eq, ne, count } from 'drizzle-orm'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (session.data.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const userId = getRouterParam(event, 'userId')
  if (!userId) throw createError({ statusCode: 400, message: 'User ID required' })

  if (userId === session.data.userId) {
    throw createError({ statusCode: 400, message: 'Cannot delete your own account' })
  }

  const db = useDB()

  // Prevent deleting the last admin
  const [{ adminCount = 0 } = {}] = await db
    .select({ adminCount: count() })
    .from(users)
    .where(eq(users.role, 'admin'))

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!target) throw createError({ statusCode: 404, message: 'User not found' })

  if (target.role === 'admin' && adminCount <= 1) {
    throw createError({ statusCode: 400, message: 'Cannot delete the last admin account' })
  }

  await db.delete(users).where(eq(users.id, userId))
  return { success: true }
})
