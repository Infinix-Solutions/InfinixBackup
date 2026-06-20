export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }
  return { id: session.data.userId, username: session.data.username, role: session.data.role }
})
