import { sql, eq } from 'drizzle-orm'
import { backupDestinations, jobDestinations } from '../../database/schema'

export default defineEventHandler(async () => {
  const db = useDB()

  return db
    .select({
      id: backupDestinations.id,
      name: backupDestinations.name,
      type: backupDestinations.type,
      createdAt: backupDestinations.createdAt,
      updatedAt: backupDestinations.updatedAt,
      jobsCount: sql<number>`count(${jobDestinations.jobId})::int`
    })
    .from(backupDestinations)
    .leftJoin(jobDestinations, eq(jobDestinations.destinationId, backupDestinations.id))
    .groupBy(backupDestinations.id)
})
