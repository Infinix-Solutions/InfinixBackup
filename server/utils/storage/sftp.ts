import SFTPClient from 'ssh2-sftp-client'
import { Readable } from 'stream'
import type { SftpConfig } from '../types'

export async function uploadToSftp(
  stream: Readable,
  fileName: string,
  config: SftpConfig
): Promise<{ sizeBytes: number }> {
  const sftp = new SFTPClient()

  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password || undefined,
      privateKey: config.privateKey || undefined,
      passphrase: config.passphrase || undefined,
      readyTimeout: 10000
    })

    const remotePath = `${config.remotePath.replace(/\/$/, '')}/${fileName}`

    try {
      await sftp.mkdir(config.remotePath, true)
    } catch {
      // directory may already exist
    }

    let sizeBytes = 0
    const countingStream = new Readable({ read() {} })

    stream.on('data', (chunk: Buffer) => {
      sizeBytes += chunk.length
      countingStream.push(chunk)
    })
    stream.on('end', () => countingStream.push(null))
    stream.on('error', err => countingStream.destroy(err))

    await sftp.put(countingStream, remotePath)
    return { sizeBytes }
  } finally {
    await sftp.end()
  }
}

export async function deleteFromSftp(fileName: string, config: SftpConfig): Promise<void> {
  const sftp = new SFTPClient()
  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password || undefined,
      privateKey: config.privateKey || undefined,
      passphrase: config.passphrase || undefined
    })
    await sftp.delete(`${config.remotePath.replace(/\/$/, '')}/${fileName}`)
  } finally {
    await sftp.end()
  }
}

export async function downloadFromSftp(fileName: string, config: SftpConfig): Promise<Buffer> {
  const sftp = new SFTPClient()
  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password || undefined,
      privateKey: config.privateKey || undefined,
      passphrase: config.passphrase || undefined
    })
    const remotePath = `${config.remotePath.replace(/\/$/, '')}/${fileName}`
    return await sftp.get(remotePath) as Buffer
  } finally {
    await sftp.end()
  }
}

export async function testSftpConnection(config: SftpConfig): Promise<void> {
  const sftp = new SFTPClient()
  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password || undefined,
      privateKey: config.privateKey || undefined,
      passphrase: config.passphrase || undefined,
      readyTimeout: 10000
    })
    await sftp.list(config.remotePath)
  } finally {
    await sftp.end()
  }
}
