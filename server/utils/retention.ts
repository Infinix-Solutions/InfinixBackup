import { eq, and, lt, desc } from 'drizzle-orm'
import { backupRuns, backupJobs, backupDestinations, jobDestinations } from '../database/schema'
import { decryptConfig } from './encryption'
import { deleteFromS3 } from './storage/s3'
import { deleteFromFtp } from './storage/ftp'
import { deleteFromSftp } from './storage/sftp'
import { deleteFromLocal } from './storage/local'
import type { S3Config, FtpConfig, SftpConfig, LocalConfig } from './types'

interface RetentionResult {
  jobId: string
  jobName: string
  deleted: number
  failed: number
  freedBytes: number
}

async function deleteFile(
  fileName: string,
  destinationType: string,
  destinationConfig: Record<string, unknown>
): Promise<void> {
  const cfg = destinationConfig as Record<string, unknown>
  switch (destinationType) {
    case 's3':
      await deleteFromS3(fileName, cfg as unknown as S3Config)
      break
    case 'ftp':
      await deleteFromFtp(fileName, cfg as unknown as FtpConfig)
      break
    case 'sftp':
      await deleteFromSftp(fileName, cfg as unknown as SftpConfig)
      break
    case 'local':
      deleteFromLocal(fileName, cfg as unknown as LocalConfig)
      break
    default:
      throw new Error(`Unknown destination type: ${destinationType}`)
  }
}

async function loadJobDestinations(jobId: string) {
  const db = useDB()
  return db
    .select({
      type: backupDestinations.type,
      config: backupDestinations.config
    })
    .from(jobDestinations)
    .innerJoin(backupDestinations, eq(jobDestinations.destinationId, backupDestinations.id))
    .where(eq(jobDestinations.jobId, jobId))
}

export async function applyRetentionForJob(
  jobId: string
): Promise<RetentionResult> {
  const db = useDB()

  const job = await db.query.backupJobs.findFirst({
    where: eq(backupJobs.id, jobId)
  })

  if (!job) throw new Error(`Job ${jobId} not found`)

  const destinations = await loadJobDestinations(jobId)
  if (destinations.length === 0) throw new Error(`No destinations for job ${jobId}`)

  const result: RetentionResult = {
    jobId,
    jobName: job.name,
    deleted: 0,
    failed: 0,
    freedBytes: 0
  }

  if (job.retentionDays === 0) return result

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - job.retentionDays)

  const oldRuns = await db
    .select({
      id: backupRuns.id,
      fileName: backupRuns.fileName,
      fileSizeBytes: backupRuns.fileSizeBytes
    })
    .from(backupRuns)
    .where(
      and(
        eq(backupRuns.jobId, jobId),
        eq(backupRuns.status, 'success'),
        lt(backupRuns.createdAt, cutoffDate)
      )
    )
    .orderBy(desc(backupRuns.createdAt))

  for (const run of oldRuns) {
    try {
      if (run.fileName) {
        for (const dest of destinations) {
          await deleteFile(
            run.fileName,
            dest.type,
            decryptConfig(dest.config as Record<string, unknown>)
          ).catch(err => console.error(`[retention] Delete from ${dest.type} failed:`, err))
        }
        result.freedBytes += run.fileSizeBytes || 0
      }
      await db.delete(backupRuns).where(eq(backupRuns.id, run.id))
      result.deleted++
      console.log(`[retention] Deleted backup ${run.fileName} from job ${job.name}`)
    } catch (err) {
      result.failed++
      console.error(`[retention] Failed to delete run ${run.id}:`, err)
      await db
        .update(backupRuns)
        .set({ status: 'cancelled' })
        .where(eq(backupRuns.id, run.id))
    }
  }

  return result
}

export async function applyRetentionForJobByCount(
  jobId: string,
  keepCount: number
): Promise<RetentionResult> {
  const db = useDB()

  const job = await db.query.backupJobs.findFirst({
    where: eq(backupJobs.id, jobId)
  })

  if (!job) throw new Error(`Job ${jobId} not found`)

  const destinations = await loadJobDestinations(jobId)

  const result: RetentionResult = {
    jobId,
    jobName: job.name,
    deleted: 0,
    failed: 0,
    freedBytes: 0
  }

  if (keepCount === 0) return result

  const allSuccessRuns = await db
    .select({
      id: backupRuns.id,
      fileName: backupRuns.fileName,
      fileSizeBytes: backupRuns.fileSizeBytes
    })
    .from(backupRuns)
    .where(and(eq(backupRuns.jobId, jobId), eq(backupRuns.status, 'success')))
    .orderBy(desc(backupRuns.createdAt))

  const toDelete = allSuccessRuns.slice(keepCount)

  for (const run of toDelete) {
    try {
      if (run.fileName && destinations.length > 0) {
        for (const dest of destinations) {
          await deleteFile(
            run.fileName,
            dest.type,
            decryptConfig(dest.config as Record<string, unknown>)
          ).catch(err => console.error(`[retention] Delete from ${dest.type} failed:`, err))
        }
        result.freedBytes += run.fileSizeBytes || 0
      }
      await db.delete(backupRuns).where(eq(backupRuns.id, run.id))
      result.deleted++
    } catch (err) {
      result.failed++
      console.error(`[retention] Failed to delete run ${run.id}:`, err)
    }
  }

  return result
}

export async function applyRetentionAll(): Promise<RetentionResult[]> {
  const db = useDB()

  const jobs = await db
    .select({
      id: backupJobs.id,
      retentionDays: backupJobs.retentionDays,
      retentionCount: backupJobs.retentionCount
    })
    .from(backupJobs)
    .where(eq(backupJobs.enabled, true))

  const results: RetentionResult[] = []

  for (const job of jobs) {
    if (job.retentionDays === 0 && job.retentionCount === 0) continue
    try {
      if (job.retentionDays > 0) {
        const result = await applyRetentionForJob(job.id)
        if (result.deleted > 0 || result.failed > 0) results.push(result)
      }
      if (job.retentionCount > 0) {
        const result = await applyRetentionForJobByCount(job.id, job.retentionCount)
        if (result.deleted > 0 || result.failed > 0) results.push(result)
      }
    } catch (err) {
      console.error(`[retention] Failed for job ${job.id}:`, err)
    }
  }

  return results
}
