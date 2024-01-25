import { useContext, useEffect, useState, createContext, Dispatch, SetStateAction } from 'react'
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
    socket: Socket | null,
    events: Event[],
    setEvents: Dispatch<SetStateAction<Event[]>>,
    listeners: Listener[],
    setListeners: Dispatch<SetStateAction<Listener[]>>,
}>({
    socket: null,
    events: [],
    setEvents: () => {},
    listeners: [],
    setListeners: () => {},
})

export function SocketIOProvider({
    url,
    children,
  }: {
    url: string
    children: React.ReactNode
  }) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [socketOpts, setSocketOpts] = useState<SocketOpts>({})
    const [events, setEvents] = useState<Event[]>([])
    const [listeners, setListeners] = useState<Listener[]>([])
    const ready = useReady()
    useEffect(() => {
        if (!socket && url && ready) {
            const backendUrl = new URL(url)
            const path =
            backendUrl.pathname[backendUrl.pathname.length - 1] === '/'
                ? backendUrl.pathname.substring(0, backendUrl.pathname.length - 1)
                : backendUrl.pathname
            const newSocketOpts = path ? { ...socketOpts, path: `${path}/socket.io/` } : socketOpts
            let socketConnection = io(backendUrl.origin, newSocketOpts)
            setSocketOpts(newSocketOpts)
            setSocket(socketConnection)
        }
        if(socket && ready) {
            socket.connect();
            while (events.length > 0) {
                const currentEvent = events.shift();
                if(currentEvent?.event && currentEvent?.args) {
                    socket.emit(currentEvent.event, JSON.parse(currentEvent.args));
                }
            }
            while(listeners.length > 0) {
                const currentListener = listeners.shift();
                if(currentListener?.event && currentListener?.cb) {
                    socket.on(currentListener.event, currentListener.cb);
                }
            }
        }
        return () => {
            if(socket) {
                socket.disconnect();
            }
        };
    }, [url, ready]);

    return (
      <SocketIOContext.Provider value={{socket, events, setEvents, listeners, setListeners}}>
        {socket ? children : null}
      </SocketIOContext.Provider>
    )
  }

export function useSend<T>(): (newEvent: string, msg: T) => void {
    const {socket, setEvents}= useContext(SocketIOContext)
    if (!socket) throw new Error('socket must be used within a SocketIOContext / Provider')
    const ready = useReady()

    return (newEvent: string, msg: T) => {
        if(ready) {
            console.log('ready and emiting event', newEvent, msg)
            socket.emit(newEvent, msg)
        } else {
            console.log('not ready emiting event', newEvent, msg)
            setEvents((prevEvents) => [...prevEvents, {event: newEvent, args: JSON.stringify(msg)}])
        }
    }
  }

  export function useEventListener<T>(newEvent: string, cb: (msg: T) => void) {
    const {socket, listeners, setListeners}= useContext(SocketIOContext)
    if (!socket) throw new Error('socket must be used within a SocketIOContext / Provider')
    const ready = useReady()
    useEffect(() => {
        if (!cb) return
        if(ready) {
            socket.on(newEvent, cb)
        } else {
            setListeners((listeners) => [...listeners, {event: newEvent, cb}])
        }
        return () => {
            if (ready) {
                socket?.off(newEvent, cb)
              } else {
                const idx = listeners.findIndex(
                  (listener) => listener.event === newEvent && listener.cb === cb,
                )
                if (idx) setListeners(listeners.splice(idx, 1))
              }
        }
      }, [cb, ready, newEvent, socket, setListeners, listeners])
  }
