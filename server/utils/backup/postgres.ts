import { spawn } from 'child_process'
import { createGzip } from 'zlib'
import { Readable } from 'stream'
import { sshExec, shEscape } from '../ssh/exec'
import type { PostgresConfig, CompressionType, SshConnectionConfig } from '../types'

export function createPostgresBackup(config: PostgresConfig, compression: CompressionType, ssh?: SshConnectionConfig): Readable {
  if (ssh) {
    const gzip = compression === 'gzip' ? '| gzip' : ''
    const cmd = [
      `PGPASSWORD=${shEscape(config.password || '')}`,
      `PGSSLMODE=${config.ssl ? 'require' : 'disable'}`,
      'pg_dump',
      `-h ${shEscape(config.host)}`,
      `-p ${config.port}`,
      `-U ${shEscape(config.username)}`,
      `-d ${shEscape(config.database)}`,
      '--no-password --format=plain --clean --if-exists',
      config.extraArgs || '',
      gzip
    ].filter(Boolean).join(' ')
    return sshExec(cmd, ssh)
  }

  const args = [
    '-h', config.host, '-p', String(config.port),
    '-U', config.username, '-d', config.database,
    '--no-password', '--format=plain', '--clean', '--if-exists'
  ]
  if (config.extraArgs) args.push(...config.extraArgs.split(' ').filter(Boolean))

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PGPASSWORD: config.password,
    ...(config.ssl ? { PGSSLMODE: 'require' } : {})
  }
  const proc = spawn('pg_dump', args, { env })
  proc.stderr.on('data', (d: Buffer) => console.error('[pg_dump stderr]', d.toString()))

  if (compression === 'gzip') {
    const gzip = createGzip()
    proc.stdout.pipe(gzip)
    proc.on('error', err => gzip.destroy(err))
    proc.on('close', code => { if (code !== 0) gzip.destroy(new Error(`pg_dump exited with code ${code}`)) })
    return gzip
  }
  proc.on('error', err => console.error('[pg_dump error]', err))
  return proc.stdout
}

export async function testPostgresConnection(config: PostgresConfig): Promise<void> {
  const { Pool } = await import('pg')
  const pool = new Pool({
    host: config.host, port: config.port, database: config.database,
    user: config.username, password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000, max: 1
  })
  const client = await pool.connect()
  try { await client.query('SELECT 1') } finally { client.release(); await pool.end() }
}
