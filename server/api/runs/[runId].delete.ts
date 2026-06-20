import { eq } from 'drizzle-orm'
import { backupRuns, backupDestinations, jobDestinations } from '../../database/schema'
import { decryptConfig } from '../../utils/encryption'
import { deleteFromS3 } from '../../utils/storage/s3'
import { deleteFromFtp } from '../../utils/storage/ftp'
import { deleteFromSftp } from '../../utils/storage/sftp'
import { deleteFromLocal } from '../../utils/storage/local'
import { logger } from '../../utils/logger'
import type { S3Config, FtpConfig, SftpConfig, LocalConfig } from '../../utils/types'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (session.data.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const runId = getRouterParam(event, 'runId')
  if (!runId) throw createError({ statusCode: 400, message: 'Run ID required' })

  const db = useDB()
  const [run] = await db.select().from(backupRuns).where(eq(backupRuns.id, runId))
  if (!run) throw createError({ statusCode: 404, message: 'Run not found' })

  if (run.fileName && run.jobId) {
    const dests = await db
      .select({ type: backupDestinations.type, config: backupDestinations.config })
      .from(jobDestinations)
      .innerJoin(backupDestinations, eq(jobDestinations.destinationId, backupDestinations.id))
      .where(eq(jobDestinations.jobId, run.jobId))

    for (const dest of dests) {
      const cfg = decryptConfig(dest.config as Record<string, unknown>)
      try {
        switch (dest.type) {
          case 's3': await deleteFromS3(run.fileName, cfg as unknown as S3Config); break
          case 'ftp': await deleteFromFtp(run.fileName, cfg as unknown as FtpConfig); break
          case 'sftp': await deleteFromSftp(run.fileName, cfg as unknown as SftpConfig); break
          case 'local': deleteFromLocal(run.fileName, cfg as unknown as LocalConfig); break
        }
        logger.info('runs:delete', `Deleted ${run.fileName} from ${dest.type}`)
      } catch (err) {
        logger.warn('runs:delete', `Could not delete ${run.fileName} from ${dest.type}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  await db.delete(backupRuns).where(eq(backupRuns.id, runId))
  return { deleted: true }
})
