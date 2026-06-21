import { eq } from 'drizzle-orm'
import type { Readable } from 'stream'
import { backupRuns, backupDestinations, jobDestinations } from '../../../database/schema'
import { decryptConfig } from '../../../utils/encryption'
import { downloadFromS3 } from '../../../utils/storage/s3'
import { downloadFromFtp } from '../../../utils/storage/ftp'
import { downloadFromSftp } from '../../../utils/storage/sftp'
import { downloadFromLocal } from '../../../utils/storage/local'
import type { S3Config, FtpConfig, SftpConfig, LocalConfig } from '../../../utils/types'

export default defineEventHandler(async (event) => {
  const runId = getRouterParam(event, 'runId')!
  const { destinationId } = getQuery(event) as { destinationId?: string }
  const db = useDB()

  const run = await db.query.backupRuns.findFirst({
    where: eq(backupRuns.id, runId)
  })

  if (!run || !run.fileName) {
    throw createError({ statusCode: 404, message: 'Run not found or has no file' })
  }
  if (run.status !== 'success') {
    throw createError({ statusCode: 400, message: 'Run did not complete successfully' })
  }

  const allDestinations = await db
    .select({ id: backupDestinations.id, type: backupDestinations.type, config: backupDestinations.config })
    .from(jobDestinations)
    .innerJoin(backupDestinations, eq(jobDestinations.destinationId, backupDestinations.id))
    .where(eq(jobDestinations.jobId, run.jobId))

  const successIds = run.destinationResults
    ?.filter(r => r.status === 'success')
    .map(r => r.id)

  const candidates = allDestinations.filter(d => {
    if (destinationId) return d.id === destinationId
    if (successIds?.length) return successIds.includes(d.id)
    return true
  })

  if (!candidates.length) {
    throw createError({ statusCode: 404, message: 'No available destination to download from' })
  }

  const fileName = run.fileName
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`)
  setResponseHeader(event, 'Content-Type', 'application/octet-stream')

  let lastError: unknown
  for (const dest of candidates) {
    try {
      const config = decryptConfig(dest.config as Record<string, unknown>)
      let result: Readable | Buffer

      switch (dest.type) {
        case 's3':
          result = await downloadFromS3(fileName, config as unknown as S3Config)
          break
        case 'sftp':
          result = await downloadFromSftp(fileName, config as unknown as SftpConfig)
          break
        case 'ftp':
          result = await downloadFromFtp(fileName, config as unknown as FtpConfig)
          break
        case 'local':
          result = downloadFromLocal(fileName, config as unknown as LocalConfig)
          break
        default:
          continue
      }

      if (Buffer.isBuffer(result)) return result
      return sendStream(event, result)
    } catch (err) {
      lastError = err
    }
  }

  throw createError({ statusCode: 500, message: `Download failed: ${(lastError as Error)?.message}` })
})
