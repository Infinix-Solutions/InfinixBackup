import { createReadStream, createWriteStream, existsSync, unlinkSync, statSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import type { Readable } from 'stream'
import type { LocalConfig } from '../types'

export async function uploadToLocal(
  stream: Readable,
  fileName: string,
  config: LocalConfig
): Promise<{ sizeBytes: number, filePath: string }> {
  await mkdir(config.path, { recursive: true })

  const filePath = join(config.path, fileName)
  const writeStream = createWriteStream(filePath)

  await new Promise<void>((resolve, reject) => {
    stream.pipe(writeStream)
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
    stream.on('error', reject)
  })

  const stats = statSync(filePath)
  return { sizeBytes: stats.size, filePath }
}

export function deleteFromLocal(fileName: string, config: LocalConfig): void {
  const filePath = join(config.path, fileName)
  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }
}

export function downloadFromLocal(fileName: string, config: LocalConfig): Readable {
  const filePath = join(config.path, fileName)
  return createReadStream(filePath)
}

export async function testLocalPath(config: LocalConfig): Promise<void> {
  await mkdir(config.path, { recursive: true })
}
