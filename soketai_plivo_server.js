import express from 'express'
import plivo from 'plivo'
import { WebSocketServer } from "ws"
import { RealtimeClient, RealtimeUtils } from "@openai/realtime-api-beta"

// Load instructions for Soket.ai S2S client
import { instructions } from "./conversation.js"

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ override: true })
const PLIVO_PORT = process.env.PLIVO_PORT
const PLIVO_WS_URL = process.env.PLIVO_WS_URL + ":" + PLIVO_PORT
const PLIVO_STREAM_TAG = "/plivo_stream"
const PLIVO_WS_STREAM_URL = PLIVO_WS_URL + PLIVO_STREAM_TAG

// Create Express app
const app = express()
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

// Route handlers
app.post('/answer.xml', (req, res) => {
  var plivoResponse = plivo.Response()
  var streamParams = {
    "audioTrack": "inbound",
    "bidirectional": true,
    "contentType": "audio/x-l16;rate=8000",
    "keepCallAlive": true,
    "streamTimeout": "120",
  }
  plivoResponse.addStream(PLIVO_WS_STREAM_URL, streamParams)
  console.log("Sent response to user, method: " + req.method)
  res.set('Content-Type', 'text/xml')
  res.send(plivoResponse.toXML())
})

// Catch-all route for undefined routes
app.use((req, res) => {
  console.log(req.url)
  res.sendStatus(404)
})

// Create HTTP server from Express app
const server = app.listen(PLIVO_PORT, () => {
  console.log(`Running on port ${PLIVO_PORT} ...`)
})

const wss = new WebSocketServer({ noServer: true })

// WebSocket connection handler
wss.on('connection', async (ws, req) =>  {
  const client = new RealtimeClient({ 
    url: process.env.S2S_WS_URL,
    apiKey: process.env.SOKETAI_API_KEY 
  })

  //
  // Relay: S2S -> Plivo
  //

  // Close the WebSocket connection when the client disconnects
  client.realtime.on('close', () => ws.close())

  // Handle conversation updates
  client.on('conversation.updated', ({item, delta}) => {
    if(delta?.audio) {
      var plivoEvent = {
        "event": "playAudio",
        "media": {
          "contentType": "wav",
          "sampleRate": "8000",
          "payload": RealtimeUtils.arrayBufferToBase64(delta.audio)
        }
      }
      if(!!ws) {
        ws.send(JSON.stringify(plivoEvent))
      }
    }
  })

  // Handle conversation interruptions
  client.on('conversation.interrupted', (event) => {
    console.log("Interrupted!")
    var plivoEvent = {
      "event": "clearAudio"
    }
    if(!!ws)
      ws.send(JSON.stringify(plivoEvent))
  })

  //
  // Relay: Plivo -> S2S
  //
  const messageQueue = []

  // Handle WebSocket errors
  ws.on('error', console.error)

  // Close the WebSocket connection when the client disconnects
  ws.on('close', () => client.disconnect())
  
  // Handle incoming messages
  ws.on('message', (msg) => {
    const data = JSON.parse(msg)
    if(data.event !== "media") {
      return
    }
    if(!client.isConnected()) {
      messageQueue.push(RealtimeUtils.base64ToArrayBuffer(data.media.payload))
    } else { 
      client.appendInputAudio(RealtimeUtils.base64ToArrayBuffer(data.media.payload))
    }
  })

  // Connect to Soket.ai S2S client
  try {
    console.log(`Connecting to Soket.ai S2S client...`)
    await client.connect()
    client.updateSession({ 
      instructions: instructions,
      turn_detection: { type: 'server_vad' }
    })

    // Send initial message to Soket.ai S2S client to trigger the conversation
    client.sendUserMessageContent([
      {
        type: `input_text`,
        text: `Hello!`
      },
    ])
  } catch (e) {
    console.log(`Error connecting to S2S: ${e.message}`)
    ws.close()
    return
  }
  console.log(`Connected to S2S successfully!`)

  // Empty the queue and send the audio to the Soket.ai S2S client
  while(messageQueue.length)
    client.appendInputAudio(messageQueue.shift())
})

// Handle WebSocket upgrade
server.on('upgrade', (req, sock, head) => {
  const { pathname } = new URL(req.url, PLIVO_WS_URL)

  console.log(pathname)
  if (pathname === PLIVO_STREAM_TAG) {
    wss.handleUpgrade(req, sock, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else {
    sock.destroy()
  }
})