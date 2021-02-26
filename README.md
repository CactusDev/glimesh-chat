
# Glimesh Chat

Connect to Glimesh's chat servers with ease!

## Usage

Using this package is very simple:


#### Typescript

```typescript

import { GlimeshChat } from "glimesh-chat"

const chat = new GlimeshChat({ token: "<MY TOKEN HERE>" })

chat.connect("<MY CHANNEL HERE>").then((meta) => {
    chat.on("message", msg => {
        console.log(msg)
        chat.sendMessage("Wow! I got your message!")
    })
})
```

#### Node

```node

const Glimesh = require("glimesh-chat")

const chat = new Glimesh.GlimeshChat({ token: "<MY TOKEN HERE>" })

chat.connect("<MY CHANNEL HERE>").then(meta => {
    chat.on("message", msg => {
        console.log(msg)
        chat.sendMessage("Wow! I got your message!")
    })
})
```

And that's it! This will automatically start the heartbeat loop to keep the connection alive. It is your application's responsibility to handle authentication token refreshing.

You can then later disconnect with `await chat.close()`

## Other things you can do

For these examples, assume that you're already connected to the chat servers, like the previous examples, with the `chat` variable.

#### Ban / unban user

```node
// Ban
await chat.banUser(userId)

// Unban
await chat.unbanUser(userId)
```

#### Short / Long timeout

Short timeout on Glimesh is defined as a 5 minute timeout and a long timeout is 15 minutes.

```node
await chat.shortTimeout(userId)
await chat.longTimeout(userId)
```

#### Send custom payload

Got a custom payload to send? Use this!

```node
await chat.send([ packet: "data", here: true ])
```

#### Get user id

```node
const id = await chat.getUserId("usernameHere")
```

#### Get channel id

```node
const id = await chat.getChannelId("usernameHere")
```

#### Get moderators in the channel

```node
const mods = await chat.getModerators("usernameHere")
mods.forEach(mod => {
    console.log(`user: ${mod.id} can ban ${mod.canBan} can long timeout ${mod.canLongTimeout} can short timeout ${mod.canShortTimeout} can untimeout ${mod.canUnTimeout}`)
})
```
