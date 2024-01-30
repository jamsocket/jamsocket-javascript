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
  socket: Socket | null
  events: Event[]
  setEvents: Dispatch<SetStateAction<Event[]>>
  listeners: Listener[]
  setListeners: Dispatch<SetStateAction<Listener[]>>
}>({
  socket: null,
  events: [],
  setEvents: () => {},
  listeners: [],
  setListeners: () => {},
})

export function SocketIOProvider({ url, children }: { url: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [socketOpts, setSocketOpts] = useState<SocketOpts>({})
  const [events, setEvents] = useState<Event[]>([])
  const [listeners, setListeners] = useState<Listener[]>([])
  const ready = useReady()
  console.log(events)
  console.log(listeners)
  useEffect(() => {
    if (!socket && url) {
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
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [url, socket])

  useEffect(() => {
    if (socket && ready) {
        socket.connect()
        events.forEach((event) => {
            if (event?.event && event?.args) {
              socket.emit(event.event, JSON.parse(event.args));
            }
          });

          setEvents([]); // Clear events after processing

          listeners.forEach((listener) => {
            if (listener?.event && listener?.cb) {
              socket.on(listener.event, listener.cb);
            }
          });
          setListeners([]);
      }
  }, [socket, ready])

  return (
    <SocketIOContext.Provider value={{ socket, events, setEvents, listeners, setListeners }}>
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
    const { socket, setListeners } = useContext(SocketIOContext);
    const ready = useReady();
    if (!socket) {
      throw new Error('useEventListener must be used within a SocketIOContext/Provider');
    }
    useEffect(() => {
        if (ready) {
            socket.on(event, callback);
        }
        else {
            setListeners((prevListeners) => [...prevListeners, { event, cb: callback }]);
        }
        return () => {
            if (ready) {
                socket.off(event, callback);
            }
            else {
                setListeners((prevListeners) => {
                    const newListeners = [...prevListeners];
                    const index = newListeners.findIndex((listener) => listener.event === event);
                    if (index > -1) {
                        newListeners.splice(index, 1);
                    }
                    return newListeners;
                });
            }
        };
    }, [ready, event, callback]);
  }
