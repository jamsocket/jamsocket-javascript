import 'server-only'
import 'isomorphic-fetch' // fetch polyfill for older versions of Node
import { SpawnResult } from './types'

export type JamsocketInitOptions = {
  account: string,
  token: string,
  service: string,
  apiUrl?: string,
}

export type JamsocketSpawnOptions = {
  tag?: string,
  lock?: string,
  env?: Record<string, string>,
  gracePeriodSeconds?: number,
  requireBearerToken?: boolean,
}

type JamsocketApiSpawnBody = {
  tag?: string,
  lock?: string,
  env?: Record<string, string>,
  grace_period_seconds?: number,
  require_bearer_token?: boolean,
  port?: number,
}

const JAMSOCKET_API = 'https://api.jamsocket.com'

export function init(opts: JamsocketInitOptions) {
  const { account, token, service } = opts
  const apiUrl = opts.apiUrl || JAMSOCKET_API

  return async function spawn(spawnOpts: JamsocketSpawnOptions = {}): Promise<SpawnResult> {
    const reqBody: JamsocketApiSpawnBody = {}
    if (spawnOpts.lock) reqBody.lock = spawnOpts.lock
    if (spawnOpts.tag) reqBody.tag = spawnOpts.tag
    if (spawnOpts.env) reqBody.env = spawnOpts.env
    if (spawnOpts.gracePeriodSeconds) reqBody.grace_period_seconds = spawnOpts.gracePeriodSeconds
    if (spawnOpts.requireBearerToken) reqBody.require_bearer_token = spawnOpts.requireBearerToken

    const response = await fetch(`${apiUrl}/user/${account}/service/${service}/spawn`, {
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
