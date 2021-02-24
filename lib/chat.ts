
import * as WebSocket from "ws"

import { EventEmitter } from "events"
import { default as Axios } from "axios"

export interface APIAuthentication {
    token?: string
    clientId?: string
}

export interface ConnectionMetadata {
    connected: boolean
    readOnly: boolean
}

const API_URL: string = "https://glimesh.tv/api"

export class GlimeshChat extends EventEmitter {

    private socket: WebSocket
    private _connected: boolean = false
    private readOnly = false
    private token = ""
    private heartbeatTimer: NodeJS.Timeout

    private client: any

    constructor(private auth: APIAuthentication) {
        super()
    }

    public async getChannelId(username: string): Promise<number> {
        const data = `query { channel(username: "${username}") { id } }`

        try {
            const response: any = await this.client.post("", {
                query: data
            })
            return +response.data.data.channel.id
        } catch (e) {
            console.error(e)
        }
        return 0
    }

    public async close() {
        clearInterval(this.heartbeatTimer)
    }

    public async connect(channel: string): Promise<ConnectionMetadata> {
        // Find out what kind of token we'll be using for this
        let suffix = null
        let readOnly = false

        let headers: any = {
            "Content-Type": "application/json"
        }

        if (this.auth.token) {
            suffix = `token=${this.auth.token}`
            headers["Authorization"] = `Bearer ${this.auth.token}`
        } else if (this.auth.clientId) {
            suffix = `client_id=${this.auth.clientId}`
            headers["Authorization"] = `Client-ID ${this.auth.clientId}`
            readOnly = true
        }
        this.readOnly = readOnly

        if (!suffix) {
            return {
                connected: false,
                readOnly
            }
        }

        this.client = Axios.create({
            baseURL: API_URL,
            headers
        })

        this.socket = new WebSocket(`wss://glimesh.tv/api/socket/websocket?vsn=2.0.0&${suffix}`)

        this.socket.on("open", async () => {
            // Got connected to the websocket server.
            this._connected = true

            // Send the initial connection packet
            const packet = [
                "1",
                "1",
                "__absinthe__:control",
                "phx_join",
                {}
            ]
            this.send(packet)

            // Now that we're connected to the socket, and said that we want to connect we have to start the heartbeat loop before it's too late.
            this.heartbeatTimer = setInterval(async () => await this.send([ "1", "1", "phoenix", "heartbeat", {} ]), 29 * 1000)
        
            const channelId = await this.getChannelId(channel)

            // Next, connect to the chat channel.
            const joinQuery = `subscription{ chatMessage(channelId: ${channelId}) { user { username } message } }`
            const joinPacket = [
                "1",
                "1",
                "__absinthe__:control",
                "doc",
                {
                    query: joinQuery,
                    variables: {}
                }
            ]
            this.send(joinPacket)

            const messageQuery = `mutation {createChatMessage(channelId: ${channelId}, message: {message: "Ohai! I'm CactusBot!"}) { message }}`
            const messagePacket = [
                "1",
                "1",
                "__absinthe__:control",
                "doc",
                {
                    query: messageQuery,
                    variables: {}
                }
            ]
            this.send(messagePacket)
        })

        this.socket.on("message", (message) => {
            console.log(message);
            this.emit("message", message.toString())
        })

        return {
            connected: true,
            readOnly
        }
    }

    public send(packet: any) {
        this.socket.send(JSON.stringify(packet))
    }

    public get connected(): boolean {
        return this._connected
    }
}
