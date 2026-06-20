import { sshConnections } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await getAuthSession(event)
  const db = useDB()
  const rows = await db.select({
    id: sshConnections.id,
    name: sshConnections.name,
    host: sshConnections.host,
    port: sshConnections.port,
    username: sshConnections.username,
    publicKey: sshConnections.publicKey,
    createdAt: sshConnections.createdAt,
    updatedAt: sshConnections.updatedAt
  }).from(sshConnections).orderBy(sshConnections.createdAt)

  return rows
})
