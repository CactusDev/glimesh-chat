
import * as WebSocket from "ws"

import { EventEmitter } from "events"

export interface APIAuthentication {
    token?: string
    clientId?: string
}

export interface ConnectionMetadata {
    connected: boolean
    readOnly: boolean
}

export class GlimeshAPI extends EventEmitter {

    private socket: WebSocket
    private _connected: boolean = false

    constructor(private auth: APIAuthentication) {
        super()
    }

    public async connect(): Promise<ConnectionMetadata> {
        // Find out what kind of token we'll be using for this
        let suffix = null
        let readOnly = false

        if (this.auth.token) {
            suffix = `token=${this.auth.token}`
        } else if (this.auth.clientId) {
            suffix = `client_id=${this.auth.clientId}`
            readOnly = true
        }

        if (!suffix) {
            return {
                connected: false,
                readOnly
            }
        }

        this.socket = new WebSocket(`wss://glimesh.tv/api/socket/websocket?vsn=2.0.0&${suffix}`)

        this.socket.on("open", () => {
            // Got connected to the websocket server.
            this._connected = true
        })

        this.socket.on("message", (message) => {
            this.emit("message", message.toString())
        })

        return {
            connected: true,
            readOnly
        }
    }

    public get connected(): boolean {
        return this._connected
    }
}
