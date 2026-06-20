export interface PostgresConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  extraArgs?: string
}

export interface MysqlConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  extraArgs?: string
}

export interface MongoConfig {
  uri: string
  database?: string
  authDb?: string
  extraArgs?: string
}

export interface FilesConfig {
  path: string
}

export interface DockerPostgresConfig {
  containerName: string
  database: string
  username: string
  password?: string
  extraArgs?: string
}

export interface DockerMysqlConfig {
  containerName: string
  database: string
  username: string
  password: string
  extraArgs?: string
}

export interface DockerMongoConfig {
  containerName: string
  database?: string
  uri?: string
  username?: string
  password?: string
  authDb?: string
  extraArgs?: string
}

export interface DockerFolderConfig {
  containerName: string
  folderPath: string
}

export interface S3Config {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
  pathPrefix?: string
  forcePathStyle?: boolean
}

export interface FtpConfig {
  host: string
  port: number
  username: string
  password: string
  remotePath: string
  secure: boolean
}

export interface SftpConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
  remotePath: string
}

export interface LocalConfig {
  path: string
}

export interface SshConnectionConfig {
  host: string
  port: number
  username: string
  privateKey: string
}

export type CompressionType = 'none' | 'gzip' | 'zip'
export type SourceType =
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'files'
  | 'docker_postgresql'
  | 'docker_mysql'
  | 'docker_mongodb'
  | 'docker_folder'
export type DestinationType = 's3' | 'ftp' | 'sftp' | 'local'
