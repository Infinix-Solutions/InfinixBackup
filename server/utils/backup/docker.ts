import { spawn } from 'child_process'
import { createGzip } from 'zlib'
import type { Readable } from 'stream'
import { PassThrough } from 'stream'
import { sshExec, shEscape } from '../ssh/exec'
import type {
  DockerPostgresConfig,
  DockerMysqlConfig,
  DockerFolderConfig,
  CompressionType,
  SshConnectionConfig
} from '../types'

function pipeWithCompression(
  proc: ReturnType<typeof spawn>,
  compression: CompressionType,
  label: string
): Readable {
  if (compression === 'gzip' || compression === 'zip') {
    const gzip = createGzip()
    proc.stdout!.pipe(gzip)
    proc.on('error', err => gzip.destroy(err))
    proc.on('close', (code) => {
      if (code !== 0)
        gzip.destroy(new Error(`${label} exited with code ${code}`))
    })
    return gzip
  }
  proc.on('close', (code) => {
    if (code !== 0) console.error(`[${label}] exited with code ${code}`)
  })
  return proc.stdout as Readable
}

export function createDockerPostgresBackup(
  config: DockerPostgresConfig,
  compression: CompressionType,
  ssh?: SshConnectionConfig
): Readable {
  const dumpArgs = [
    '-U', config.username,
    '-d', config.database,
    '--no-password', '--format=plain', '--clean', '--if-exists'
  ]
  if (config.extraArgs) dumpArgs.push(...config.extraArgs.split(' ').filter(Boolean))

  if (ssh) {
    const gzip = compression === 'gzip' || compression === 'zip' ? '| gzip' : ''
    const inner = ['pg_dump', ...dumpArgs].map(shEscape).join(' ')
    const cmd = `docker exec -e ${shEscape(`PGPASSWORD=${config.password || ''}`)} ${shEscape(config.containerName)} ${inner} ${gzip}`.trim()
    return sshExec(cmd, ssh)
  }

  const proc = spawn('docker', [
    'exec', '-e', `PGPASSWORD=${config.password || ''}`, config.containerName, 'pg_dump', ...dumpArgs
  ])
  proc.stderr.on('data', (d: Buffer) => console.error('[docker pg_dump stderr]', d.toString()))
  return pipeWithCompression(proc, compression, 'docker pg_dump')
}

export function createDockerMysqlBackup(
  config: DockerMysqlConfig,
  compression: CompressionType,
  ssh?: SshConnectionConfig
): Readable {
  const dumpArgs = [
    `-u${config.username}`, `-p${config.password}`,
    '--single-transaction', '--routines', '--triggers', config.database
  ]
  if (config.extraArgs) dumpArgs.push(...config.extraArgs.split(' ').filter(Boolean))

  if (ssh) {
    const gzip = compression === 'gzip' || compression === 'zip' ? '| gzip' : ''
    const inner = ['mysqldump', ...dumpArgs].map(shEscape).join(' ')
    const cmd = `docker exec ${shEscape(config.containerName)} ${inner} ${gzip}`.trim()
    return sshExec(cmd, ssh)
  }

  const proc = spawn('docker', ['exec', config.containerName, 'mysqldump', ...dumpArgs])
  proc.stderr.on('data', (d: Buffer) => {
    const msg = d.toString()
    if (!msg.includes('Using a password on the command line')) console.error('[docker mysqldump stderr]', msg)
  })
  return pipeWithCompression(proc, compression, 'docker mysqldump')
}

export function createDockerFolderBackup(
  config: DockerFolderConfig,
  compression: CompressionType,
  ssh?: SshConnectionConfig
): Readable {
  const folderPath = config.folderPath
  const parentDir = folderPath.includes('/')
    ? folderPath.substring(0, folderPath.lastIndexOf('/')) || '/'
    : '/'
  const folderName = (folderPath.includes('/')
    ? folderPath.substring(folderPath.lastIndexOf('/') + 1)
    : folderPath) || '.'

  const tarFlags = compression === 'gzip' || compression === 'zip' ? '--gzip' : ''

  if (ssh) {
    const cmd = [
      'docker exec',
      shEscape(config.containerName),
      'tar --create',
      tarFlags,
      `--file=- --directory=${shEscape(parentDir)} ${shEscape(folderName)}`
    ].filter(Boolean).join(' ')
    return sshExec(cmd, ssh)
  }

  const pass = new PassThrough()

  const tarCmd = ['tar', '--create', '--file=-', `--directory=${parentDir}`, folderName]
  if (tarFlags) tarCmd.splice(1, 0, tarFlags)

  function spawnTar(dockerArgs: string[]): ReturnType<typeof spawn> {
    const proc = spawn('docker', dockerArgs)
    proc.stderr.on('data', (d: Buffer) => {
      const msg = d.toString()
      if (msg.trim()) console.error('[docker folder tar stderr]', msg)
    })
    return proc
  }

  checkTarInContainer(config.containerName)
    .then((hasTar) => {
      if (hasTar) {
        const proc = spawnTar(['exec', config.containerName, ...tarCmd])
        proc.stdout!.pipe(pass)
        proc.on('close', (code) => {
          if (code !== 0) pass.destroy(new Error(`docker exec tar exited with code ${code}`))
          else pass.end()
        })
        proc.on('error', err => pass.destroy(err))
      } else {
        console.log(`[docker folder] container has no tar, using Alpine sidecar for ${config.containerName}`)
        const proc = spawnTar(['run', '--rm', '--volumes-from', config.containerName, 'alpine', ...tarCmd])
        proc.stdout!.pipe(pass)
        proc.on('close', (code) => {
          if (code !== 0) pass.destroy(new Error(`alpine sidecar tar exited with code ${code}`))
          else pass.end()
        })
        proc.on('error', err => pass.destroy(err))
      }
    })
    .catch(err => pass.destroy(err))

  return pass
}

async function checkTarInContainer(containerName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('docker', ['exec', containerName, 'which', 'tar'])
    proc.on('close', code => resolve(code === 0))
    proc.on('error', () => resolve(false))
  })
}

export async function testDockerContainer(containerName: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('docker', ['inspect', '--format', '{{.State.Running}}', containerName])
    let output = ''
    proc.stdout.on('data', (d: Buffer) => {
      output += d.toString()
    })
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Container "${containerName}" not found`))
      if (output.trim() !== 'true') return reject(new Error(`Container "${containerName}" is not running`))
      resolve()
    })
    proc.on('error', reject)
  })
}

export async function testDockerFolderAccess(config: DockerFolderConfig): Promise<void> {
  await testDockerContainer(config.containerName)

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('docker', ['exec', config.containerName, 'test', '-e', config.folderPath])
    proc.on('close', (code) => {
      if (code !== 0) {
        const sidecar = spawn('docker', ['run', '--rm', '--volumes-from', config.containerName, 'alpine', 'test', '-e', config.folderPath])
        sidecar.on('close', (c) => {
          if (c !== 0) reject(new Error(`Path "${config.folderPath}" not found in container`))
          else resolve()
        })
        sidecar.on('error', reject)
      } else {
        resolve()
      }
    })
    proc.on('error', reject)
  })
}
