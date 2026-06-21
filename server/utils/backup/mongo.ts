import { spawn } from 'child_process'
import { createGzip } from 'zlib'
import type { Readable } from 'stream'
import { sshExec, shEscape } from '../ssh/exec'
import type { MongoConfig, DockerMongoConfig, CompressionType, SshConnectionConfig } from '../types'

export function createMongoBackup(config: MongoConfig, compression: CompressionType, ssh?: SshConnectionConfig): Readable {
  if (ssh) {
    const gzip = compression === 'gzip' ? '| gzip' : ''
    const parts = ['mongodump', `--uri=${shEscape(config.uri)}`, '--archive']
    if (config.database) parts.push(`--db=${shEscape(config.database)}`)
    if (config.authDb) parts.push(`--authenticationDatabase=${shEscape(config.authDb)}`)
    if (config.extraArgs) parts.push(config.extraArgs)
    if (gzip) parts.push(gzip)
    return sshExec(parts.join(' '), ssh)
  }

  const args = ['--archive', '--uri', config.uri]
  if (config.database) args.push('--db', config.database)
  if (config.authDb) args.push('--authenticationDatabase', config.authDb)
  if (config.extraArgs) args.push(...config.extraArgs.split(' ').filter(Boolean))

  const proc = spawn('mongodump', args)
  proc.stderr.on('data', (d: Buffer) => {
    const msg = d.toString()
    if (!msg.startsWith('\t')) console.error('[mongodump stderr]', msg)
  })

  if (compression === 'gzip') {
    const gzip = createGzip()
    proc.stdout.pipe(gzip)
    proc.on('error', err => gzip.destroy(err))
    proc.on('close', (code) => { if (code !== 0) gzip.destroy(new Error(`mongodump exited with code ${code}`)) })
    return gzip
  }
  proc.on('error', err => console.error('[mongodump error]', err))
  return proc.stdout
}

export function createDockerMongoBackup(config: DockerMongoConfig, compression: CompressionType, ssh?: SshConnectionConfig): Readable {
  const dumpArgs = ['--archive']
  if (config.uri) dumpArgs.push('--uri', config.uri)
  if (config.database) dumpArgs.push('--db', config.database)
  if (config.username && config.password) {
    dumpArgs.push('-u', config.username, '-p', config.password)
    if (config.authDb) dumpArgs.push('--authenticationDatabase', config.authDb)
  }
  if (config.extraArgs) dumpArgs.push(...config.extraArgs.split(' ').filter(Boolean))

  if (ssh) {
    const gzip = compression === 'gzip' ? '| gzip' : ''
    const inner = ['mongodump', ...dumpArgs].map(shEscape).join(' ')
    const cmd = `docker exec --no-tty ${shEscape(config.containerName)} ${inner} ${gzip}`.trim()
    return sshExec(cmd, ssh)
  }

  const proc = spawn('docker', ['exec', '--no-tty', config.containerName, 'mongodump', ...dumpArgs])
  proc.stderr.on('data', (d: Buffer) => {
    const msg = d.toString()
    if (!msg.startsWith('\t')) console.error('[docker mongodump stderr]', msg)
  })

  if (compression === 'gzip') {
    const gzip = createGzip()
    proc.stdout.pipe(gzip)
    proc.on('error', err => gzip.destroy(err))
    proc.on('close', (code) => { if (code !== 0) gzip.destroy(new Error(`docker mongodump exited with code ${code}`)) })
    return gzip
  }
  return proc.stdout
}

export async function testMongoConnection(config: MongoConfig): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('mongosh', ['--uri', config.uri, '--eval', 'db.adminCommand("ping")'])
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => { if (code !== 0) reject(new Error(`MongoDB connection failed: ${stderr}`)); else resolve() })
    proc.on('error', reject)
    setTimeout(() => { proc.kill(); reject(new Error('Connection timeout')) }, 8000)
  })
}
