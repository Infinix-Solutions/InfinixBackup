import { Client } from 'basic-ftp'
import { Readable, Writable } from 'stream'
import type { FtpConfig } from '../types'

export async function uploadToFtp(
  stream: Readable,
  fileName: string,
  config: FtpConfig
): Promise<{ sizeBytes: number }> {
  const client = new Client()

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure: config.secure
    })

    const remotePath = `${config.remotePath.replace(/\/$/, '')}/${fileName}`
    await client.ensureDir(config.remotePath)

    let sizeBytes = 0
    const countingStream = new Readable({ read() {} })

    stream.on('data', (chunk: Buffer) => {
      sizeBytes += chunk.length
      countingStream.push(chunk)
    })
    stream.on('end', () => countingStream.push(null))
    stream.on('error', err => countingStream.destroy(err))

    await client.uploadFrom(countingStream, remotePath)
    return { sizeBytes }
  } finally {
    client.close()
  }
}

export async function deleteFromFtp(fileName: string, config: FtpConfig): Promise<void> {
  const client = new Client()
  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure: config.secure
    })
    await client.remove(`${config.remotePath.replace(/\/$/, '')}/${fileName}`)
  } finally {
    client.close()
  }
}

export async function downloadFromFtp(fileName: string, config: FtpConfig): Promise<Buffer> {
  const client = new Client()
  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure: config.secure
    })
    const remotePath = `${config.remotePath.replace(/\/$/, '')}/${fileName}`
    const chunks: Buffer[] = []
    const writable = new Writable({
      write(chunk: Buffer, _, callback) {
        chunks.push(chunk)
        callback()
      }
    })
    await client.downloadTo(writable, remotePath)
    return Buffer.concat(chunks)
  } finally {
    client.close()
  }
}

export async function testFtpConnection(config: FtpConfig): Promise<void> {
  const client = new Client()
  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure: config.secure
    })
    await client.list(config.remotePath)
  } finally {
    client.close()
  }
}
