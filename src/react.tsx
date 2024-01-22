import { createContext, useContext, useEffect, useState } from 'react'
import { SessionBackend } from './client'
import { SpawnResult } from './types'

export const SessionBackendContext = createContext<SessionBackend | null>(null)

export function SessionBackendProvider({
  spawnResult,
  children,
}: {
  spawnResult: SpawnResult
  children: React.ReactNode
}) {
  const { url, statusUrl } = spawnResult
  const [backend, setBackend] = useState<SessionBackend | null>(null)

  useEffect(() => {
    setBackend(new SessionBackend(url, statusUrl))
    return () => {
      backend?.destroy()
    }
  }, [url, statusUrl])
  return (
    <SessionBackendContext.Provider value={backend}>
      {backend ? children : null}
    </SessionBackendContext.Provider>
  )
}

export function useReady(): boolean {
  const backend = useContext(SessionBackendContext)
  if (!backend) throw new Error('useReady must be used within a SessionBackendContext / Provider')
  const [isReady, setIsReady] = useState(backend.isReady())

  useEffect(() => {
    return backend.onReady(() => setIsReady(true))
  }, [backend])

  return isReady
}

// export function useSend<T>(): (event: string, msg: T) => void {
//   const backend = useContext(SessionBackendContext)
//   if (!backend)
//     throw new Error('useEventListener must be used within a SessionBackendContext / Provider')
//   return (event, msg) => backend.send(event, msg)
// }

// export function useEventListener<T>(event: string, cb: (msg: T) => void) {
//   console.log('event')
//   const backend = useContext(SessionBackendContext)
//   if (!backend)
//     throw new Error('useEventListener must be used within a SessionBackendContext / Provider')

//   useEffect(() => {
//     if (!cb) return
//     backend.on(event, cb)
//     return () => backend.off(event, cb)
//   }, [backend, event, cb])
// }

// another option

// export function useEvent<T>(event: string, cb?: (msg: T) => void): (msg: T) => void {
//   const backend = useContext(SessionBackendContext)
//   if (!backend) throw new Error('useEventListener must be used within a SessionBackendContext / Provider')

//   useEffect(() => {
//     if (!cb) return
//     backend.on(event, cb)
//     return () => backend.off(event, cb)
//   }, [backend, event, cb])

//   return (msg) => backend.send(event, msg)
// }
