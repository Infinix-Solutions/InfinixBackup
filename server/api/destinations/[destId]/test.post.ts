import { eq } from 'drizzle-orm'
import { backupDestinations } from '../../../database/schema'
import { decryptConfig } from '../../../utils/encryption'
import { testS3Connection } from '../../../utils/storage/s3'
import { testFtpConnection } from '../../../utils/storage/ftp'
import { testSftpConnection } from '../../../utils/storage/sftp'
import { testLocalPath } from '../../../utils/storage/local'
import type { S3Config, FtpConfig, SftpConfig, LocalConfig } from '../../../utils/types'

export default defineEventHandler(async (event) => {
  const destId = getRouterParam(event, 'destId')
  if (!destId) throw createError({ statusCode: 400, message: 'Destination ID required' })

  const db = useDB()
  const dest = await db.query.backupDestinations.findFirst({
    where: eq(backupDestinations.id, destId)
  })
  if (!dest) throw createError({ statusCode: 404, message: 'Destination not found' })

  try {
    const cfg = decryptConfig(dest.config) as Record<string, unknown>
    switch (dest.type) {
      case 's3':
        await testS3Connection(cfg as unknown as S3Config)
        break
      case 'ftp':
        await testFtpConnection(cfg as unknown as FtpConfig)
        break
      case 'sftp':
        await testSftpConnection(cfg as unknown as SftpConfig)
        break
      case 'local':
        await testLocalPath(cfg as unknown as LocalConfig)
        break
    }
    return { success: true, message: 'Connection successful' }
  } catch (err) {
    throw createError({
      statusCode: 422,
      message: err instanceof Error ? err.message : 'Connection test failed'
    })
  }
})
