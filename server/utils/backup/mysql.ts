import { spawn } from 'child_process'
import { createGzip } from 'zlib'
import type { Readable } from 'stream'
import { sshExec, shEscape } from '../ssh/exec'
import type { MysqlConfig, CompressionType, SshConnectionConfig } from '../types'

export function createMysqlBackup(config: MysqlConfig, compression: CompressionType, ssh?: SshConnectionConfig): Readable {
  if (ssh) {
    const gzip = compression === 'gzip' ? '| gzip' : ''
    const cmd = [
      'mysqldump',
      `-h${shEscape(config.host)}`,
      `-P${config.port}`,
      `-u${shEscape(config.username)}`,
      `-p${shEscape(config.password)}`,
      '--single-transaction --routines --triggers',
      shEscape(config.database),
      config.extraArgs || '',
      gzip
    ].filter(Boolean).join(' ')
    return sshExec(cmd, ssh)
  }

  const args = [
    `-h${config.host}`, `-P${config.port}`,
    `-u${config.username}`, `-p${config.password}`,
    '--single-transaction', '--routines', '--triggers', config.database
  ]
  if (config.extraArgs) args.push(...config.extraArgs.split(' ').filter(Boolean))

  const proc = spawn('mysqldump', args)
  proc.stderr.on('data', (d: Buffer) => {
    const msg = d.toString()
    if (!msg.includes('Using a password on the command line')) console.error('[mysqldump stderr]', msg)
  })

  if (compression === 'gzip') {
    const gzip = createGzip()
    proc.stdout.pipe(gzip)
    proc.on('error', err => gzip.destroy(err))
    proc.on('close', (code) => {
      if (code !== 0) gzip.destroy(new Error(`mysqldump exited with code ${code}`))
    })
    return gzip
  }
  return proc.stdout
}

export async function testMysqlConnection(config: MysqlConfig): Promise<void> {
  const { spawn } = await import('child_process')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('mysqladmin', [`-h${config.host}`, `-P${config.port}`, `-u${config.username}`, `-p${config.password}`, 'ping'])
    proc.on('close', code => code === 0 ? resolve() : reject(new Error('MySQL connection failed')))
    proc.on('error', reject)
  })
}
