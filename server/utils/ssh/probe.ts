import { sshExecString } from "./exec";
import type { SshConfig } from "./exec";

export interface SshProbeResult {
  docker: boolean;
  postgres: boolean;
  mysql: boolean;
  mongo: boolean;
  containers: string[];
}

const PROBE_CMD = `
(docker info > /dev/null 2>&1 && echo "docker=1" || echo "docker=0");


(command -v pg_dump > /dev/null 2>&1 && echo "postgres=1" || echo "postgres=0");
(command -v mysqldump > /dev/null 2>&1 && echo "mysql=1" || echo "mysql=0");
(command -v mongodump > /dev/null 2>&1 && echo "mongo=1" || echo "mongo=0");
`.trim();

export async function probeServer(config: SshConfig): Promise<SshProbeResult> {
  const output = await sshExecString(PROBE_CMD, config);

  const result: SshProbeResult = {
    docker: false,
    postgres: false,
    mysql: false,
    mongo: false,
    containers: [],
  };

  for (const line of output.split("\n")) {
    const [key, val] = line.trim().split("=");
    if (!key) continue;
    if (key === "docker") result.docker = val === "1";
    if (key === "postgres") result.postgres = val === "1";
    if (key === "mysql" || key === "mariadb") result.mysql = val === "1";
    if (key === "mongo") result.mongo = val === "1";
    if (key === "container" && val) result.containers.push(val);
  }

  return result;
}
