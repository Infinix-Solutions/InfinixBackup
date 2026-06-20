import { eq } from 'drizzle-orm'
import { backupSources } from '../../../database/schema'
import { decryptConfig } from '../../../utils/encryption'
import { testPostgresConnection } from '../../../utils/backup/postgres'
import { testMysqlConnection } from '../../../utils/backup/mysql'
import { testMongoConnection } from '../../../utils/backup/mongo'
import { testDockerContainer } from '../../../utils/backup/docker'
import { testFilesPath } from '../../../utils/backup/files'
import type {
  PostgresConfig, MysqlConfig, MongoConfig, FilesConfig,
  DockerPostgresConfig, DockerFolderConfig
} from '../../../utils/types'

export default defineEventHandler(async (event) => {
  const sourceId = getRouterParam(event, 'sourceId')
  if (!sourceId) throw createError({ statusCode: 400, message: 'Source ID required' })

  const db = useDB()
  const source = await db.query.backupSources.findFirst({
    where: eq(backupSources.id, sourceId)
  })
  if (!source) throw createError({ statusCode: 404, message: 'Source not found' })

  try {
    const cfg = decryptConfig(source.config) as Record<string, unknown>
    switch (source.type) {
      case 'postgresql':
        await testPostgresConnection(cfg as unknown as PostgresConfig)
        break
      case 'mysql':
        await testMysqlConnection(cfg as unknown as MysqlConfig)
        break
      case 'mongodb':
        await testMongoConnection(cfg as unknown as MongoConfig)
        break
      case 'docker_postgresql':
        await testDockerContainer((cfg as unknown as DockerPostgresConfig).containerName)
        break
      case 'docker_mysql':
        await testDockerContainer((cfg as unknown as DockerPostgresConfig).containerName)
        break
      case 'docker_mongodb':
        await testDockerContainer((cfg as unknown as DockerPostgresConfig).containerName)
        break
      case 'docker_folder':
        await testDockerContainer((cfg as unknown as DockerFolderConfig).containerName)
        break
      case 'files':
        await testFilesPath(cfg as unknown as FilesConfig)
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
