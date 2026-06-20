import { webhooks } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const db = useDB()
  const rows = await db.select().from(webhooks).orderBy(webhooks.createdAt)
  return rows
})
