
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
