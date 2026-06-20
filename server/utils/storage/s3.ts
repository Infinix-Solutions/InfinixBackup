import { S3Client, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Readable } from 'stream'
import type { S3Config } from '../types'

function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle ?? !!config.endpoint
  })
}

export async function uploadToS3(
  stream: Readable,
  fileName: string,
  config: S3Config
): Promise<{ sizeBytes: number }> {
  const client = createS3Client(config)
  const key = config.pathPrefix ? `${config.pathPrefix.replace(/\/$/, '')}/${fileName}` : fileName

  let sizeBytes = 0
  const countingStream = new Readable({
    read() {}
  })

  stream.on('data', (chunk: Buffer) => {
    sizeBytes += chunk.length
    countingStream.push(chunk)
  })
  stream.on('end', () => countingStream.push(null))
  stream.on('error', err => countingStream.destroy(err))

  const upload = new Upload({
    client,
    params: {
      Bucket: config.bucket,
      Key: key,
      Body: countingStream,
      ContentType: fileName.endsWith('.gz') ? 'application/gzip' : 'application/octet-stream'
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024
  })

  await upload.done()
  return { sizeBytes }
}

export async function deleteFromS3(fileName: string, config: S3Config): Promise<void> {
  const client = createS3Client(config)
  const key = config.pathPrefix ? `${config.pathPrefix.replace(/\/$/, '')}/${fileName}` : fileName

  await client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key
  }))
}

export async function downloadFromS3(fileName: string, config: S3Config): Promise<Readable> {
  const client = createS3Client(config)
  const key = config.pathPrefix ? `${config.pathPrefix.replace(/\/$/, '')}/${fileName}` : fileName
  const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
  return response.Body as Readable
}

export async function testS3Connection(config: S3Config): Promise<void> {
  const client = createS3Client(config)
  await client.send(new ListObjectsV2Command({
    Bucket: config.bucket,
    MaxKeys: 1
  }))
}
