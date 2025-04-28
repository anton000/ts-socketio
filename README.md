# ts-socketio

TypeScript library providing end-to-end type safety for Socket.IO communication using Zod schemas for validation, based on a shared contract definition.

## Features

- **End-to-End Type Safety**: Strong TypeScript typings for Socket.IO clients and servers
- **Contract-Based API**: Define your API structure once, use it on both client and server
- **Runtime Validation**: Zod schemas ensure payloads and responses match at runtime
- **RPC-Style Interface**: Clean, intuitive API for emitting events and handling responses
- **Enhanced Decorators**: Streamlined NestJS integration with powerful decorators
- **Zero Config**: No code generation step required

## Packages

This monorepo contains the following packages:

- **@ts-socketio/core**: Core types, contract definition, and validation
- **@ts-socketio/client**: Type-safe Socket.IO client
- **@ts-socketio/server**: Type-safe Socket.IO server
- **@ts-socketio/nestjs**: NestJS integration with decorators and modules

## Installation

```bash
# Install packages
npm install @ts-socketio/core @ts-socketio/client
npm install @ts-socketio/server

# For NestJS integration
npm install @ts-socketio/nestjs
```

## Usage

### 1. Define a Contract

Create a shared contract using Zod schemas:

```typescript
import { defineSocketContract, z } from '@ts-socketio/core';

export const chatContract = defineSocketContract({
  // Client -> Server Events
  Client: {
    setNickname: {
      payload: z.object({ nickname: z.string() }),
      response: z.object({ success: z.boolean() })
    }
  },
  // Server -> Client Events
  Server: {
    userJoined: {
      payload: z.object({ userId: z.string(), nickname: z.string() })
    }
  },
  // Shared/Bidirectional Events
  sendMessage: {
    payload: z.object({ text: z.string() })
  }
});
```

### 2. Client Implementation

```typescript
import { createTypedSocketClient } from '@ts-socketio/client';
import { chatContract } from './contract';

const client = createTypedSocketClient(chatContract, 'http://localhost:3000');

// Type-safe emitters (with IntelliSense)
async function login() {
  // Typed payload, returns Promise<typed response>
  const response = await client.setNickname({ nickname: 'Alice' });
  console.log(response.success);
}

// Type-safe listeners
client.listeners.onUserJoined((payload) => {
  console.log(`${payload.nickname} joined`);
});

client.listeners.onSendMessage((payload) => {
  console.log(`New message: ${payload.text}`);
});
```

### 3. Server Implementation

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createTypedSocketServer } from '@ts-socketio/server';
import { chatContract } from './contract';

const httpServer = createServer();
const io = new Server(httpServer);
const typedServer = createTypedSocketServer(io);

typedServer.registerContractHandlers(chatContract, (server) => {
  return {
    // Type-safe handler
    setNickname: ({ payload, socket }) => {
      const nickname = payload.nickname;
      console.log(`User ${socket.id} set nickname: ${nickname}`);
      
      // Broadcast with type-safety
      server.userJoined({ 
        userId: socket.id, 
        nickname 
      });
      
      // Type-safe response
      return { success: true };
    },
    
    sendMessage: ({ payload, socket }) => {
      // Broadcast message to all clients
      server.sendMessage({ text: payload.text });
    }
  };
});

httpServer.listen(3000);
```

### 4. NestJS Integration

```typescript
// Define a gateway
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { 
  TypedServer, 
  TsSocketHandler, 
  tsParseServerEvents 
} from '@ts-socketio/nestjs';
import { chatContract } from './contract';

// Process contract for server-side handling
const { serverContract } = tsParseServerEvents(chatContract);

@WebSocketGateway()
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @TypedServer(chatContract)
  typedServer;

  // Enhanced decorator automatically handles socket events
  @TsSocketHandler(serverContract.setNickname)
  async handleSetNickname(ctx) {
    console.log(`User ${ctx.socket.id} set nickname: ${ctx.payload.nickname}`);
    
    // Broadcast with type-safety
    this.typedServer.userJoined({ 
      userId: ctx.socket.id, 
      nickname: ctx.payload.nickname 
    });
    
    // Type-safe response (validated against schema)
    return { success: true };
  }

  @TsSocketHandler(serverContract.sendMessage)
  async handleSendMessage(ctx) {
    // Context contains payload, metadata, socket, and io
    const { payload, socket } = ctx;
    
    // Broadcast message to all clients
    this.typedServer.sendMessage({ text: payload.text });
  }
}

// Register in module
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Module({
  providers: [ChatGateway]
})
export class ChatModule {}
```

## Examples

See the `/examples` directory for complete examples:

- **basic-chat**: A simple chat application demonstrating the core features
- **nestjs-chat**: A NestJS implementation of the chat example

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/ts-socketio.git
cd ts-socketio

# Install dependencies
yarn install

# Build all packages
yarn workspace @ts-socketio/core build
yarn workspace @ts-socketio/client build
yarn workspace @ts-socketio/server build
yarn workspace @ts-socketio/nestjs build

# Run examples
yarn workspace ts-socketio-example-basic-chat dev:server
yarn workspace ts-socketio-example-nestjs-chat start:dev
```

## License

MIT