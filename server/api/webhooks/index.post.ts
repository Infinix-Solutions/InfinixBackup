import { webhooks } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const body = await readBody(event)
  const { name, type, url, events, enabled, secret, chatId } = body

  if (!name || !url || !type || !Array.isArray(events) || events.length === 0) {
    throw createError({ statusCode: 400, message: 'name, url, type and at least one event are required' })
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw createError({ statusCode: 400, message: 'url must start with http:// or https://' })
  }

  const db = useDB()
  const [row] = await db.insert(webhooks).values({
    name,
    type,
    url,
    events,
    enabled: enabled ?? true,
    secret: secret || null,
    chatId: chatId || null
  }).returning()

  setResponseStatus(event, 201)
  return row
})
