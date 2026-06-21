import { request } from 'node:http'

interface DockerContainer {
  Id: string
  Names: string[]
  Image: string
  Status: string
  State: string
}

export default defineEventHandler(async () => {
  return new Promise<Array<{ name: string, image: string, status: string }>>((resolve) => {
    const req = request(
      {
        socketPath: '/var/run/docker.sock',
        path: '/containers/json',
        method: 'GET'
      },
      (res) => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          try {
            const containers: DockerContainer[] = JSON.parse(data)
            const selfId = (process.env.HOSTNAME || '').slice(0, 12)
            const result = containers
              .filter(c => !selfId || !c.Id.startsWith(selfId))
              .map(c => ({
                name: c.Names[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
                image: c.Image,
                status: c.Status
              }))
            resolve(result)
          } catch {
            resolve([])
          }
        })
      }
    )
    req.on('error', () => resolve([]))
    req.setTimeout(3000, () => {
      req.destroy()
      resolve([])
    })
    req.end()
  })
})
