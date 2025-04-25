# TS-SocketIO Basic Chat Example

This example demonstrates how to use the `@ts-socketio/*` packages to create a type-safe chat application with Socket.IO.

## Features

- Type-safe Socket.IO communication
- Contract-based API with Zod validation
- Real-time messaging
- User notifications
- Typing indicators

## Running the Example

### 1. Start the Server

In one terminal:

```bash
# From the monorepo root
yarn workspace ts-socketio-example-basic-chat dev:server
```

### 2. Start One or More Clients

In another terminal:

```bash
# From the monorepo root
yarn workspace ts-socketio-example-basic-chat dev:client
```

You can open multiple terminals to simulate multiple clients.

## Usage

1. When the client starts, you'll be prompted to enter a nickname
2. Type your messages and press Enter to send
3. Type `/exit` to quit
4. You'll see:
   - Notifications when users join or leave
   - Messages from other users
   - Typing indicators when other users are typing

## How It Works

- `contract.ts` - Defines the shared contract between client and server using Zod schemas
- `server.ts` - Creates the Socket.IO server with type-safe event handlers
- `client.ts` - Command-line client with type-safe event emitters and listeners

The contract defines:
- Client → Server events: `setNickname`, `typing`, `sendMessage`
- Server → Client events: `userNotification`, `typingStatus`, `sendMessage`

This demonstrates how the library enables fully type-safe, bi-directional communication with Socket.IO. 