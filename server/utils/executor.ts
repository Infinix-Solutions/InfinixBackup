import { eq } from "drizzle-orm";
import type { RunDestinationResult } from "../database/schema";
import { createWriteStream, createReadStream } from "fs";
import { unlink, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { pipeline } from "stream/promises";
import { backupJobs, backupRuns, backupDestinations, jobDestinations } from "../database/schema";
import { dispatchWebhooks } from "./webhook-dispatch";
import { decryptConfig } from "./encryption";
import { applyRetentionForJob, applyRetentionForJobByCount } from "./retention";
import { createPostgresBackup } from "./backup/postgres";
import { createMysqlBackup } from "./backup/mysql";
import { createMongoBackup, createDockerMongoBackup } from "./backup/mongo";
import {
  createDockerPostgresBackup,
  createDockerMysqlBackup,
  createDockerFolderBackup,
} from "./backup/docker";
import { createFilesBackup } from "./backup/files";
import { uploadToS3 } from "./storage/s3";
import { uploadToFtp } from "./storage/ftp";
import { uploadToSftp } from "./storage/sftp";
import { uploadToLocal } from "./storage/local";
import type {
  PostgresConfig,
  MysqlConfig,
  MongoConfig,
  FilesConfig,
  DockerPostgresConfig,
  DockerMysqlConfig,
  DockerMongoConfig,
  DockerFolderConfig,
  S3Config,
  FtpConfig,
  SftpConfig,
  LocalConfig,
  CompressionType,
  SshConnectionConfig,
} from "./types";
import type { Readable } from "stream";
import { logger } from "./logger";

function getExtension(type: string, compression: CompressionType): string {
  let base: string;
  switch (type) {
    case "files":
    case "docker_folder":
      base = ".tar";
      break;
    case "mongodb":
    case "docker_mongodb":
      base = ".archive";
      break;
    default:
      base = ".sql";
  }
  if (compression === "gzip") return `${base}.gz`;
  return base;
}

function createBackupStream(
  source: { type: string; config: Record<string, unknown> },
  compression: CompressionType,
  ssh?: SshConnectionConfig,
): Readable {
  const cfg = source.config as Record<string, unknown>;

  switch (source.type) {
    case "postgresql":
      return createPostgresBackup(cfg as unknown as PostgresConfig, compression, ssh);
    case "mysql":
      return createMysqlBackup(cfg as unknown as MysqlConfig, compression, ssh);
    case "mongodb":
      return createMongoBackup(cfg as unknown as MongoConfig, compression, ssh);
    case "docker_postgresql":
      return createDockerPostgresBackup(cfg as unknown as DockerPostgresConfig, compression, ssh);
    case "docker_mysql":
      return createDockerMysqlBackup(cfg as unknown as DockerMysqlConfig, compression, ssh);
    case "docker_mongodb":
      return createDockerMongoBackup(cfg as unknown as DockerMongoConfig, compression, ssh);
    case "docker_folder":
      return createDockerFolderBackup(cfg as unknown as DockerFolderConfig, compression, ssh);
    case "files":
      return createFilesBackup(cfg as unknown as FilesConfig, compression, ssh);
    default:
      throw new Error(`Unknown source type: ${source.type}`);
  }
}

async function uploadStream(
  stream: Readable,
  fileName: string,
  destination: { type: string; config: Record<string, unknown> },
): Promise<{ sizeBytes: number }> {
  const cfg = destination.config as Record<string, unknown>;

  switch (destination.type) {
    case "s3":
      return uploadToS3(stream, fileName, cfg as unknown as S3Config);
    case "ftp":
      return uploadToFtp(stream, fileName, cfg as unknown as FtpConfig);
    case "sftp":
      return uploadToSftp(stream, fileName, cfg as unknown as SftpConfig);
    case "local":
      return uploadToLocal(stream, fileName, cfg as unknown as LocalConfig);
    default:
      throw new Error(`Unknown destination type: ${destination.type}`);
  }
}

export async function executeBackupJob(jobId: string): Promise<string> {
  const db = useDB();

  const job = await db.query.backupJobs.findFirst({
    where: eq(backupJobs.id, jobId),
    with: { source: { with: { sshConnection: true } } }
  });

  if (!job) throw new Error(`Job ${jobId} not found`);
  if (!job.source) throw new Error(`Source not found for job ${jobId}`);

  const destRows = await db
    .select({
      jobId: jobDestinations.jobId,
      id: backupDestinations.id,
      name: backupDestinations.name,
      type: backupDestinations.type,
      config: backupDestinations.config
    })
    .from(jobDestinations)
    .innerJoin(backupDestinations, eq(jobDestinations.destinationId, backupDestinations.id))
    .where(eq(jobDestinations.jobId, jobId));

  if (destRows.length === 0) throw new Error(`No destinations configured for job ${jobId}`);

  const source = { ...job.source, config: decryptConfig(job.source.config) };
  const destinations = destRows.map(d => ({ ...d, config: decryptConfig(d.config) }));

  let sshConfig: SshConnectionConfig | undefined;
  if (job.source.sshConnection) {
    const conn = job.source.sshConnection;
    const pkData = conn.privateKey as Record<string, unknown>;
    sshConfig = {
      host: conn.host,
      port: conn.port,
      username: conn.username,
      privateKey: (pkData.pem as string) || '',
    };
  }

  const [run] = await db
    .insert(backupRuns)
    .values({ jobId, status: "running", startedAt: new Date() })
    .returning();

  if (!run) throw new Error(`Failed to create run record for job ${jobId}`);

  const cat = `backup:${job.name}`;
  const logs: string[] = [];
  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    logs.push(line);
    logger.info(cat, msg);
  };

  const tempPath = join(tmpdir(), `infinix_${jobId}_${run.id}.tmp`);

  try {
    log(`Starting backup: ${job.name}`);
    log(`Source: ${job.source.type} - ${job.source.name}`);
    log(`Destinations: ${destinations.map(d => d.name).join(", ")}`);
    log(`Compression: ${job.compression}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const prefix = job.filenamePrefix || "backup";
    const ext = getExtension(job.source.type, job.compression as CompressionType);
    const fileName = `${prefix}_${timestamp}${ext}`;

    log(`Output file: ${fileName}`);

    // Create backup to temp file first (needed to upload to multiple destinations)
    const backupStream = createBackupStream(source, job.compression as CompressionType, sshConfig);
    await pipeline(backupStream, createWriteStream(tempPath));
    const fileStats = await stat(tempPath);
    const sizeBytes = Number(fileStats.size);
    log(`Backup created: ${sizeBytes} bytes`);

    // Upload to all destinations — continue on failure, track per-destination results
    const destResults: RunDestinationResult[] = [];
    for (const dest of destinations) {
      log(`Uploading to ${dest.name} (${dest.type})...`);
      try {
        const readStream = createReadStream(tempPath);
        await uploadStream(readStream, fileName, dest);
        destResults.push({ id: dest.id, name: dest.name, type: dest.type, status: "success" });
        log(`Upload to ${dest.name} complete`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        destResults.push({ id: dest.id, name: dest.name, type: dest.type, status: "failed", error: errMsg });
        log(`Upload to ${dest.name} FAILED: ${errMsg}`);
      }
    }

    await unlink(tempPath).catch(() => {});

    const anySuccess = destResults.some(r => r.status === "success");
    if (!anySuccess) {
      throw new Error(`All destinations failed:\n${destResults.map(r => `  ${r.name}: ${r.error}`).join("\n")}`);
    }

    await db.update(backupRuns).set({
      status: "success",
      completedAt: new Date(),
      fileName,
      fileSizeBytes: sizeBytes,
      destinationResults: destResults,
      logs: logs.join("\n"),
    }).where(eq(backupRuns.id, run.id));

    await db.update(backupJobs).set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(backupJobs.id, jobId));

    dispatchWebhooks('backup.success', {
      job: { id: job.id, name: job.name },
      run: { id: run.id, status: 'success', fileName, fileSizeBytes: sizeBytes, startedAt: run.startedAt, completedAt: new Date() }
    }).catch(console.error);

    if (job.retentionDays > 0) {
      log(`Applying day-based retention (${job.retentionDays} days)...`);
      await applyRetentionForJob(jobId);
    }
    if (job.retentionCount > 0) {
      log(`Applying count-based retention (keep last ${job.retentionCount})...`);
      await applyRetentionForJobByCount(jobId, job.retentionCount);
    }

    log("Backup completed successfully");
    return run.id;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(cat, `Backup failed: ${errMsg}`);

    await unlink(tempPath).catch(() => {});

    await db.update(backupRuns).set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: errMsg,
      logs: logs.join("\n"),
    }).where(eq(backupRuns.id, run.id));

    await db.update(backupJobs).set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(backupJobs.id, jobId));

    dispatchWebhooks('backup.failed', {
      job: { id: job.id, name: job.name },
      run: { id: run.id, status: 'failed', fileName: null, fileSizeBytes: null, startedAt: run.startedAt, completedAt: new Date(), errorMessage: errMsg }
    }).catch(console.error);

    throw error;
  }
}
