import { sshConnections } from '../../database/schema'
import { generateSshKeyPair } from '../../utils/ssh/keys'
import { installPublicKey } from '../../utils/ssh/install-key'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const body = await readBody(event)
  const { name, host, port, username, password } = body

  if (!name || !host || !username) {
    throw createError({ statusCode: 400, message: 'name, host and username are required' })
  }

  const { privateKey, publicKey } = generateSshKeyPair(`infinix@${host}`)

  const db = useDB()
  const [row] = await db.insert(sshConnections).values({
    name,
    host,
    port: port || 22,
    username,
    privateKey: { pem: privateKey },
    publicKey
  }).returning({
    id: sshConnections.id,
    name: sshConnections.name,
    host: sshConnections.host,
    port: sshConnections.port,
    username: sshConnections.username,
    publicKey: sshConnections.publicKey,
    createdAt: sshConnections.createdAt,
    updatedAt: sshConnections.updatedAt
  })

  // Fire-and-forget — don't block the HTTP response
  if (password) {
    const connPort = port || 22
    installPublicKey({ host, port: connPort, username, password }, publicKey)
      .then(() => logger.info('ssh:install', `Key installed for "${name}" (${host}:${connPort})`))
      .catch((err: Error) => logger.error('ssh:install', `Key install failed for "${name}": ${err.message}`))
  }

  setResponseStatus(event, 201)
  return { ...row, keyInstalling: !!password }
})
