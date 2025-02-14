# PLIVO STREAMING SERVER

This is a basic relay streaming server to integrate Plivo (a communications API platform) with SoketAI's Realtime API for audio streaming. Here's what it does:

1. **Server Setup**:
- Creates an Express server with WebSocket support
- Uses environment variables for configuration
- Sets up routes for handling Plivo callbacks

2. **Main Components**:

a) **HTTP Endpoints**:
- `/answer.xml`: Responds to Plivo's voice calls by setting up a bidirectional audio stream

b) **WebSocket Handler**:
- Manages real-time audio streaming between Plivo and OpenAI's Realtime API
- Creates two-way communication:
  - Plivo → Soket.ai: Receives audio from the phone call and sends it to Soket.ai
  - Soket.ai → Plivo: Receives AI responses and sends them back to the call

3. **Audio Processing**:
- Configures audio settings (8000Hz sample rate, 16bit format)
- Handles audio streaming events and conversions
- Manages conversation interruptions.

4. **Initial Setup**:
- Sends an initial "Hello!" message when connecting
- Uses predefined instructions (imported from conversation.js)
- Configures server-side Voice Activity Detection (VAD)

## Requirements

- Node.js
  -- Express
  -- WebSocket
  -- Plivo
  -- OpenAI Realtime API

- Plivo Account with a registered phone number
- Soket.ai account with an API key
- A sample conversation.js file with instructions for the AI

## Instructions

### Update .env file

Ensure you have copied the .env file into the folder to make the following variables available. Modify the values in sample.env to match your configuration and save it as .env.

sample.env 
```
SOKETAI_API_KEY=Enter your Soket.ai API key here
PLIVO_AUTH_ID=Enter your Plivo Auth ID here
PLIVO_AUTH_TOKEN=Enter your Plivo Auth Token here
PLIVO_XML_URL=Enter Server URL serving answer.xml
PLIVO_WS_URL=Enter your Plivo WebSocket URL
PLIVO_PORT=Enter port for WebSocket connection
S2S_WS_URL=Enter your Soket.ai Client WebSocket URL
```

### Run Server

The server can be run with the following command

```bash
$> node soketai_plivo_server.js
Running on port <PLIVO_PORT> ...
```

### Setup Plivo Webhook

1. Go to the Plivo phone number you want to use.
2. Click on the "Voice & Fax" tab.
3. Click on the "Webhooks" tab.
4. Click on the "Outbound Call" tab.
5. Click on the "Webhook URL" field.
6. Enter the URL of the server (i.e one corresponding to answer.xml/ endpoint)
7. Click on the "Save" button.

### Make a call

Make a call to the phone number registered with Plivo. If you have setup the webhook correctly, you should see the following messages on the server console.

```
Connecting to Soket.ai S2S client...  
Connected to S2S successfully!
```

You should also hear the AI respond to your call.

