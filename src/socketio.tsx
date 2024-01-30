import {
  useContext,
  useRef,
  useEffect,
  useState,
  createContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client'
import { useReady } from './react'

export type Event = {
  event: string
  args: string // these are stringified args - to freeze them in place
}
export type EventHandler = (...args: any[]) => void
export type Status = string
export type Listener = { event: string; cb: EventHandler }
export type SocketOpts = Partial<ManagerOptions & SocketOptions>

export const SocketIOContext = createContext<{
  socket: Socket | null
  events: Event[]
  setEvents: Dispatch<SetStateAction<Event[]>>
}>({
  socket: null,
  events: [],
  setEvents: () => {},
})

export function SocketIOProvider({ url, children }: { url: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const ready = useReady()
  useEffect(() => {
    if (!socket && url) {
      const backendUrl = new URL(url)
      const path =
        backendUrl.pathname[backendUrl.pathname.length - 1] === '/'
          ? backendUrl.pathname.substring(0, backendUrl.pathname.length - 1)
          : backendUrl.pathname
      console.log('calling io')
      let socketConnection = io(backendUrl.origin, { path: `${path}/socket.io/` })
      setSocket(socketConnection)
    }
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [url, socket])

  useEffect(() => {
    if (socket && ready) {
      console.log('ready giong through events', events)
      socket.connect()
      events.forEach((event) => {
        if (event?.event && event?.args) {
          socket.emit(event.event, JSON.parse(event.args))
        }
      })

      setEvents([]) // Clear events after processing
    }
  }, [socket, ready])

  return (
    <SocketIOContext.Provider value={{ socket, events, setEvents }}>
      {socket ? children : null}
    </SocketIOContext.Provider>
  )
}

export function useSend<T>(): (newEvent: string, msg: T) => void {
  const { socket, setEvents } = useContext(SocketIOContext)
  if (!socket) throw new Error('socket must be used within a SocketIOContext / Provider')
  const ready = useReady()

  return (newEvent: string, msg: T) => {
    if (ready) {
      socket.emit(newEvent, msg)
    } else {
      setEvents((prevEvents) => [...prevEvents, { event: newEvent, args: JSON.stringify(msg) }])
    }
  }
}

export function useEventListener<T>(event: string, callback: (msg: T) => void) {
  const { socket } = useContext(SocketIOContext)
  const ready = useReady()
  const hasRun = useRef(false)
  if (!socket) {
    throw new Error('useEventListener must be used within a SocketIOContext/Provider')
  }
  useEffect(() => {
    if (hasRun.current) {
      return
    }
    if (!ready) {
      return
    }
    socket.on(event, callback)
    return () => {
      socket.off(event, callback)
    }
  }, [ready, event])
}
