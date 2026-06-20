import { eq } from 'drizzle-orm'
import { webhooks } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Webhook ID required' })

  const db = useDB()
  const [row] = await db.select().from(webhooks).where(eq(webhooks.id, id))
  if (!row) throw createError({ statusCode: 404, message: 'Webhook not found' })
  return row
})
