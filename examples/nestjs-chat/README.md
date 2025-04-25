# TS-SocketIO NestJS Chat Example

This example demonstrates how to use the `@ts-socketio/nestjs` package to integrate type-safe Socket.IO communication into a NestJS application.

## Features

- Uses `@ts-socketio/nestjs` for type-safe integration.
- `@TypedServer` decorator for injecting a type-safe emitter.
- `tsSocketioHandler` helper for handling incoming events with validation.
- Demonstrates lifecycle hooks (`OnGatewayConnection`, `OnGatewayDisconnect`).

## Running the Example

### 1. Start the NestJS Server

In one terminal:

```bash
# From the monorepo root
yarn workspace ts-socketio-example-nestjs-chat start:dev
```

This will start the NestJS server, typically on port 3001.

### 2. Start One or More Clients

You can use the client from the `basic-chat` example to connect to this server.

**Important:**
- Make sure the `basic-chat` server is **not** running.
- Update the `serverUrl` in `examples/basic-chat/src/client.ts` to point to the NestJS server's port (e.g., `http://localhost:3001`).

In another terminal:

```bash
# From the monorepo root
yarn workspace ts-socketio-example-basic-chat dev:client
```

## How It Works

- `contract.ts`: Defines the shared API contract (same as `basic-chat`).
- `app.module.ts`: Standard NestJS module that imports the `ChatGateway`.
- `chat.gateway.ts`: The NestJS WebSocket gateway.
  - `@WebSocketGateway()`: Standard NestJS gateway decorator.
  - `@WebSocketServer()`: Injects the raw `socket.io` Server instance.
  - `@TypedServer(chatContract)`: Injects the `typedServer` emitter, providing type-safe methods for broadcasting (`this.typedServer.userNotification(...)`).
  - `@SubscribeMessage('eventName')`: Standard NestJS decorator to listen for specific client events.
  - `tsSocketioHandler(schemas, data, socket, server, callback)`: Helper function used inside `@SubscribeMessage` handlers.
    - It takes the event schemas (`{ payload?, response? }`), raw data/socket/server, and your handler logic.
    - Handles payload validation, context creation, response validation, and error handling.
    - Provides a type-safe context (`ctx`) to your callback.
- `main.ts`: Standard NestJS application bootstrap, ensuring the `IoAdapter` is used. 