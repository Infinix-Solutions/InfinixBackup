import { eq } from 'drizzle-orm'
import { webhooks } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Webhook ID required' })

  const db = useDB()
  await db.delete(webhooks).where(eq(webhooks.id, id))
  return { success: true }
})
