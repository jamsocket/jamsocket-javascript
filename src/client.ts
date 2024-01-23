export type Status = string
export type StatusStreamEvent = { state: Status; time: string }

export class SessionBackend {
  private streamReader: ReadableStreamDefaultReader | null = null
  readonly statuses: Status[] = []
  private _isReady: boolean = false
  private _onReady: (() => void)[] = []

  constructor(
    readonly url: string,
    readonly statusUrl: string,
  ) {
    this.waitUntilReady(statusUrl)
  }

  private waitUntilReady = async (statusUrl: string) => {
    const res = await fetch(statusUrl, { mode: 'cors', cache: 'no-store' })
    if (!res.ok) {
      throw new Error(
        `An error occured while fetching jamsocket backend status: ${await res.text()}`,
      )
    }
    const status = await res.text()
    console.log("wait until ready", status)
    if (status.includes('Ready')) {
      return
    }
    if (!status.includes('Loading') && !status.includes('Starting')) {
      throw new Error(`Jamsocket status is a Terminal state: ${status}`)
    }

    const response = await fetch(`${statusUrl}/stream`, { cache: 'no-store' })
    if (!response.body)
      throw new Error('response to Jamsocket backend status stream did not include body')
    this.streamReader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    while (this.streamReader !== null) {
      const result = await this.streamReader.read()
      const value = result.value as string
      if (result.done) {
        console.log('Jamsocket status stream closed by API')
        this.destroyStatusStream()
        break
      }

      const messages = value
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean)

      for (const msg of messages) {
        if (!msg?.startsWith('data:'))
          throw new Error(`Unexpected message from SSE endpoint: ${msg}`)
        const text = msg.slice(5).trim()
        let data: StatusStreamEvent | null = null
        try {
          data = JSON.parse(text) as StatusStreamEvent
        } catch (e) {
          console.error(`Error parsing status stream message as JSON: "${text}"`, e)
        }
        if (data?.state === 'Ready') {
          this.destroyStatusStream()
        }
      }
    }
  }

  private destroyStatusStream = () => {
    if (this.streamReader) {
      this.streamReader.cancel()
      this.streamReader = null
    }
  }

  public destroy() {
    this.destroyStatusStream()
  }

  public isReady() {
    return this._isReady
  }

  public onReady(cb: () => void): () => void {
    if (this.isReady()) {
      cb()
    } else {
      this._onReady.push(cb)
    }
    return () => {
      if (this.isReady()) return
      this._onReady = this._onReady.filter((c) => c !== cb)
    }
  }
}
  // public on(event: string, cb: EventHandler) {
  //   if (this.isReady()) {
  //     this.socket?.on(event, cb)
  //   } else {
  //     this.listeners.push({ event, cb })
  //   }
  // }

  // public off(event: string, cb: EventHandler) {
  //   if (this.isReady()) {
  //     this.socket?.off(event, cb)
  //   } else {
  //     const idx = this.listeners.findIndex(
  //       (listener) => listener.event === event && listener.cb === cb,
  //     )
  //     if (idx) this.listeners.splice(idx, 1)
  //   }
  // }

  // public send(event: string, ...args: any[]) {
  //   if (this.isReady()) {
  //     this.socket?.emit(event, ...args)
  //   } else {
  //     this.events.push({ event, args: JSON.stringify(args) })
  //   }
  // }

//   private openSocket() {
//     this.socket = io(this.url, this.socketOpts)
//     this.socket.on('connect', () => {
//       this._isReady = true
//       this._onReady.forEach((cb) => cb())
//       this._onReady = []

//       while (this.listeners.length > 0) {
//         const { event, cb } = this.listeners.shift()!
//         this.on(event, cb)
//       }
//       while (this.events.length > 0) {
//         const { event, args } = this.events.shift()!
//         this.send(event, ...JSON.parse(args))
//       }
//     })
//   }
// }
