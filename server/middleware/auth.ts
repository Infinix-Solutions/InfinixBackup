export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/')) return
  if (path.startsWith('/api/setup/') || path.startsWith('/api/auth/')) return

  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
})
