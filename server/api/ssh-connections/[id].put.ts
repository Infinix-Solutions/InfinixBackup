import { eq } from 'drizzle-orm'
import { sshConnections } from '../../database/schema'
import { installPublicKey } from '../../utils/ssh/install-key'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID required' })

  const body = await readBody(event)
  const { name, host, port, username, password } = body

  if (!name || !host || !username) {
    throw createError({ statusCode: 400, message: 'name, host and username are required' })
  }

  const db = useDB()

  const [existing] = await db.select({ publicKey: sshConnections.publicKey }).from(sshConnections).where(eq(sshConnections.id, id))
  if (!existing) throw createError({ statusCode: 404, message: 'SSH connection not found' })

  const [row] = await db.update(sshConnections).set({
    name,
    host,
    port: port || 22,
    username,
    updatedAt: new Date()
  }).where(eq(sshConnections.id, id)).returning({
    id: sshConnections.id,
    name: sshConnections.name,
    host: sshConnections.host,
    port: sshConnections.port,
    username: sshConnections.username,
    publicKey: sshConnections.publicKey,
    createdAt: sshConnections.createdAt,
    updatedAt: sshConnections.updatedAt
  })

  if (!row) throw createError({ statusCode: 404, message: 'SSH connection not found' })

  if (password) {
    const connPort = port || 22
    installPublicKey({ host, port: connPort, username, password }, existing.publicKey)
      .then(() => logger.info('ssh:install', `Key installed for "${name}" (${host}:${connPort})`))
      .catch((err: Error) => logger.error('ssh:install', `Key install failed for "${name}": ${err.message}`))
  }

  return { ...row, keyInstalling: !!password }
})
