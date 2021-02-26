
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
    private heartbeatTimer: NodeJS.Timeout
    private readOnly = false
    private token = ""
    private channelId = 0

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

    public async getUserId(username: string): Promise<number> {
        const data = `query { channel(username: "${username}") { id } }`

        try {
            const response: any = await this.client.post("", {
                query: data
            })
            return +response.data.data.user.id
        } catch (e) {
            console.error(e)
        }
        return 0
    }

    public async close() {
        clearInterval(this.heartbeatTimer)
        this.socket.close()
    }

    public async connect(channel: string): Promise<ConnectionMetadata> {
        return new Promise<ConnectionMetadata>((resolve, reject) => {
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
                return resolve({
                    connected: false,
                    readOnly
                })
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
                await this.send(packet)

                // Now that we're connected to the socket, and said that we want to connect we have to start the heartbeat loop before it's too late.
                this.heartbeatTimer = setInterval(async () => await this.send([ "1", "1", "phoenix", "heartbeat", {} ]), 29 * 1000)
                this.channelId = await this.getChannelId(channel)

                // Next, connect to the chat channel.
                const joinQuery = `subscription{ chatMessage(channelId: ${this.channelId}) { user { id, username } message } }`
                await this.send(this.buildPacket(joinQuery))

                return resolve({
                    connected: true,
                    readOnly: this.readOnly
                })
            })

            this.socket.on("message", (message) => {
                // Parse the message into something usable
                const packet = JSON.parse(message.toString())
                if (packet.length != 5 || packet[3] !== "subscription:data") {
                    return
                }
                if (!packet[4].result.data || !packet[4].result.data.chatMessage) {
                    return
                }
                const chatMessage = packet[4].result.data.chatMessage
                if (!chatMessage.message || !chatMessage.user.username) {
                    return
                }
                this.emit("message", chatMessage)
            })
        })
    }

    public async sendMessage(message: string) {
        const messageQuery = `mutation {createChatMessage(channelId: ${this.channelId}, message: {message: "${message}"}) { message }}`
        await this.send(this.buildPacket(messageQuery))
    }

    public async shortTimeout(user: number) {
        const timeoutQuery = `mutation {shortTimeoutUser(channelId: ${this.channelId}, userId: ${user}) { action, moderator { displayname } } }`
        await this.send(this.buildPacket(timeoutQuery))
    }

    public async longTimeout(user: number) {
        const timeoutQuery = `mutation {longTimeoutUser(channelId: ${this.channelId}, userId: ${user}) { action, moderator { displayname } } }`
        await this.send(this.buildPacket(timeoutQuery))
    }

    public async banUser(user: number) {
        const banQuery = `mutation {banUser(channelId: ${this.channelId}, userId: ${user}) { action, moderator { displayname } } }`
        await this.send(this.buildPacket(banQuery))
    }

    public async unbanUser(user: number) {
        const unbanQuery = `mutation {unbanUser(channelId: ${this.channelId}, userId: ${user}) { action, moderator { displayname } } }`
        await this.send(this.buildPacket(unbanQuery))
    }

    private buildPacket(query: string): any {
        return [
            "1",
            "1",
            "__absinthe__:control",
            "doc",
            {
                query,
                variables: {}
            }
        ]
    }

    public async send(packet: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.socket.send(JSON.stringify(packet), err => {
                if (err) {
                    return reject(err)
                }
                return resolve()
            })
        })
    }

    public get connected(): boolean {
        return this._connected
    }
}
