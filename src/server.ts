import 'server-only'
import 'isomorphic-fetch' // fetch polyfill for older versions of Node
import { SpawnResult } from './types'

export type JamsocketInitOptions = {
  account: string,
  token: string,
  endpoint?: string,
}

const JAMSOCKET_API = 'https://api.jamsocket.com'

export function init(opts: JamsocketInitOptions) {
  const { account, token } = opts
  const endpoint = opts.endpoint || JAMSOCKET_API

  return async function spawn(service: string, lock?: string, env?: Record<string, string>): Promise<SpawnResult> {
    const reqBody: { lock?: string, env?: Record<string, string> } = {}
    if (lock) reqBody.lock = lock
    if (env) reqBody.env = env
    const response = await fetch(`${endpoint}/user/${account}/service/${service}/spawn`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error(`Error spawning backend: ${response.status} ${await response.text()}`)
    }
    const body = await response.json()
    return {
      url: body.url,
      name: body.name,
      readyUrl: body.ready_url,
      statusUrl: body.status_url,
      spawned: body.spawned,
      bearerToken: body.bearer_token
    }
  }
}
