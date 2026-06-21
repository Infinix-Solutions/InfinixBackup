import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  pgEnum,
  jsonb,
  primaryKey
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const userRoleEnum = pgEnum('user_role', ['admin', 'viewer'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const sourceTypeEnum = pgEnum('source_type', [
  'postgresql',
  'mysql',
  'mongodb',
  'files',
  'docker_postgresql',
  'docker_mysql',
  'docker_mongodb',
  'docker_folder'
])

export const destinationTypeEnum = pgEnum('destination_type', [
  's3',
  'ftp',
  'sftp',
  'local'
])

export const runStatusEnum = pgEnum('run_status', [
  'pending',
  'running',
  'success',
  'failed',
  'cancelled'
])

export const compressionEnum = pgEnum('compression_type', [
  'none',
  'gzip',
  'zip'
])

export const sshConnections = pgTable('ssh_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port').notNull().default(22),
  username: varchar('username', { length: 100 }).notNull(),
  privateKey: jsonb('private_key').notNull().$type<Record<string, unknown>>(),
  publicKey: text('public_key').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const backupSources = pgTable('backup_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: sourceTypeEnum('type').notNull(),
  config: jsonb('config').notNull().$type<Record<string, unknown>>(),
  sshConnectionId: uuid('ssh_connection_id').references(() => sshConnections.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const backupDestinations = pgTable('backup_destinations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: destinationTypeEnum('type').notNull(),
  config: jsonb('config').notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const backupJobs = pgTable('backup_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  sourceId: uuid('source_id').notNull().references(() => backupSources.id, { onDelete: 'cascade' }),
  schedule: varchar('schedule', { length: 100 }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  retentionDays: integer('retention_days').notNull().default(30),
  retentionCount: integer('retention_count').notNull().default(0),
  compression: compressionEnum('compression').notNull().default('gzip'),
  filenamePrefix: varchar('filename_prefix', { length: 100 }).default('backup'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at')
})

export interface RunDestinationResult {
  id: string
  name: string
  type: string
  status: 'success' | 'failed'
  error?: string
}

export const backupRuns = pgTable('backup_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => backupJobs.id, { onDelete: 'cascade' }),
  status: runStatusEnum('status').notNull().default('pending'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  fileName: varchar('file_name', { length: 500 }),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
  errorMessage: text('error_message'),
  logs: text('logs'),
  destinationResults: jsonb('destination_results').$type<RunDestinationResult[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const jobDestinations = pgTable('job_destinations', {
  jobId: uuid('job_id').notNull().references(() => backupJobs.id, { onDelete: 'cascade' }),
  destinationId: uuid('destination_id').notNull().references(() => backupDestinations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.jobId, t.destinationId] })])

export const sshConnectionsRelations = relations(sshConnections, ({ many }) => ({
  sources: many(backupSources)
}))

export const backupSourcesRelations = relations(backupSources, ({ many, one }) => ({
  jobs: many(backupJobs),
  sshConnection: one(sshConnections, {
    fields: [backupSources.sshConnectionId],
    references: [sshConnections.id]
  })
}))

export const backupDestinationsRelations = relations(backupDestinations, ({ many }) => ({
  jobDestinations: many(jobDestinations)
}))

export const backupJobsRelations = relations(backupJobs, ({ one, many }) => ({
  source: one(backupSources, {
    fields: [backupJobs.sourceId],
    references: [backupSources.id]
  }),
  jobDestinations: many(jobDestinations),
  jobWebhooks: many(jobWebhooks),
  runs: many(backupRuns)
}))

export const jobDestinationsRelations = relations(jobDestinations, ({ one }) => ({
  job: one(backupJobs, {
    fields: [jobDestinations.jobId],
    references: [backupJobs.id]
  }),
  destination: one(backupDestinations, {
    fields: [jobDestinations.destinationId],
    references: [backupDestinations.id]
  })
}))

export const backupRunsRelations = relations(backupRuns, ({ one }) => ({
  job: one(backupJobs, {
    fields: [backupRuns.jobId],
    references: [backupJobs.id]
  })
}))

export const webhookTypeEnum = pgEnum('webhook_type', ['generic', 'discord', 'slack', 'openwa'])

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: webhookTypeEnum('type').notNull().default('generic'),
  url: text('url').notNull(),
  events: jsonb('events').notNull().$type<string[]>(),
  enabled: boolean('enabled').notNull().default(true),
  secret: varchar('secret', { length: 255 }),
  chatId: varchar('chat_id', { length: 255 }),
  sessionId: varchar('session_id', { length: 255 }),
  messageTemplate: text('message_template'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const jobWebhooks = pgTable('job_webhooks', {
  jobId: uuid('job_id').notNull().references(() => backupJobs.id, { onDelete: 'cascade' }),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.jobId, t.webhookId] })])

export type SshConnection = typeof sshConnections.$inferSelect
export type NewSshConnection = typeof sshConnections.$inferInsert
export type BackupSource = typeof backupSources.$inferSelect
export type NewBackupSource = typeof backupSources.$inferInsert
export type BackupDestination = typeof backupDestinations.$inferSelect
export type NewBackupDestination = typeof backupDestinations.$inferInsert
export type BackupJob = typeof backupJobs.$inferSelect
export type NewBackupJob = typeof backupJobs.$inferInsert
export type JobDestination = typeof jobDestinations.$inferSelect
export type NewJobDestination = typeof jobDestinations.$inferInsert
export type BackupRun = typeof backupRuns.$inferSelect
export type NewBackupRun = typeof backupRuns.$inferInsert
export const webhooksRelations = relations(webhooks, ({ many }) => ({
  jobWebhooks: many(jobWebhooks)
}))

export const jobWebhooksRelations = relations(jobWebhooks, ({ one }) => ({
  job: one(backupJobs, { fields: [jobWebhooks.jobId], references: [backupJobs.id] }),
  webhook: one(webhooks, { fields: [jobWebhooks.webhookId], references: [webhooks.id] })
}))

export type Webhook = typeof webhooks.$inferSelect
export type JobWebhook = typeof jobWebhooks.$inferSelect
export type NewWebhook = typeof webhooks.$inferInsert
