import { eq } from 'drizzle-orm'
import { backupRuns, backupDestinations, jobDestinations } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const runId = getRouterParam(event, 'runId')
  if (!runId) throw createError({ statusCode: 400, message: 'Run ID required' })

  const db = useDB()
  const run = await db.query.backupRuns.findFirst({
    where: eq(backupRuns.id, runId),
    with: {
      job: {
        with: {
          source: true,
          jobDestinations: { with: { destination: true } }
        }
      }
    }
  })

  if (!run) throw createError({ statusCode: 404, message: 'Run not found' })

  const job = run.job
    ? {
        ...run.job,
        destinationIds: run.job.jobDestinations.map(d => d.destinationId),
        destinations: run.job.jobDestinations.map(d => ({
          id: d.destination.id,
          name: d.destination.name,
          type: d.destination.type,
          config: d.destination.config
        })),
        jobDestinations: undefined
      }
    : null

  return { ...run, job }
})
