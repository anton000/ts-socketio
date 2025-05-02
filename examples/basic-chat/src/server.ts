import { createServer } from 'http';
import { Server } from 'socket.io'; // Remove unused Socket import
import { v4 as uuidv4 } from 'uuid'; // Needed if generating traceId here
import { createTypedSocketServer, EventHandlerContext } from '@ts-socketio/server'; // Remove unused ServerEmitters, EventHandlers
// Remove unused MessageMetadata import
// Import contract and custom metadata type
import { chatContract, ChatContractType, CustomMetadata } from './contract';
import { InferPayload } from '@ts-socketio/core';

// Create HTTP server and Socket.IO server
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow any origin for the example
    methods: ['GET', 'POST']
  }
});

// In-memory store of connected users
interface User {
  id: string;
  nickname: string;
}

const users: Record<string, User> = {};

// Create our typed Socket.IO server, passing contract and io
const typedServer = createTypedSocketServer(chatContract, io);

// Optional: Register server metadata provider
typedServer.setMetadataProvider((_eventName, _payload, _target) => { // Prefix unused parameters
    // Example: Add a simple trace ID to server-emitted events
    return { traceId: `server-trace-${uuidv4().substring(0, 8)}` };
});

// Register contract handlers
// Rely on inference for 'server' and return type, explicitly type 'ctx' in handlers
typedServer.registerContractHandlers((server) => { 
  console.log('Registering chat handlers with new architecture');
  return {
    // Handle setNickname event
    setNickname: async (ctx: EventHandlerContext<InferPayload<ChatContractType['definition']['Client']['setNickname']>, CustomMetadata>) => {
      const { payload, metadata, socket } = ctx; // Now destructuring is type-safe
      console.log(`User ${socket.id} wants nickname: ${payload.nickname}`);
      console.log(`  Client Msg ID: ${metadata.messageId}, Auth: ${metadata.authToken ?? 'N/A'}`);
      
      const nickname = payload.nickname.trim();
      users[socket.id] = { id: socket.id, nickname };
      
      // Emitter just takes payload, library handles metadata/envelope
      server.userNotification({
        userId: socket.id,
        nickname,
        message: `${nickname} joined the chat.`
      }, { except: [socket.id] }); // Example: broadcast except sender
      
      // Return ACK payload (not enveloped)
      return {
        success: true,
        message: 'Nickname set successfully',
        assignedNickname: nickname
      };
    },
    
    // Handle incoming messages
    sendMessage: (ctx) => {
      const { payload, metadata, socket } = ctx; // Type-safe destructuring
      console.log('Received message metadata:', metadata); // Log the metadata
      const user = users[socket.id];
      if (!user) return; // Ignore message if user not found
      
      console.log(`Message from ${user.nickname} (Msg ID: ${metadata.messageId}): ${payload.text}`);
      
      // Broadcast message envelope (library adds server metadata)
      // We need to add sender info to the payload here as per the contract
      const broadcastPayload: InferPayload<typeof chatContract.definition.sendMessage> = {
          text: payload.text, 
          senderId: socket.id,
          senderNickname: user.nickname
      };
      server.sendMessage(broadcastPayload, { except: [socket.id] });
    },
    
    // Handle typing indicators
    typing: (ctx: EventHandlerContext<InferPayload<ChatContractType['definition']['Client']['typing']>, CustomMetadata>) => {
      const { payload, metadata, socket } = ctx; // Type-safe destructuring
      console.log('Received message metadata:', metadata);
      const user = users[socket.id];
      if (!user) return;
      
      // Use the specific typingStatus event defined for Server -> Client
      // Library handles metadata/envelope
      server.typingStatus({
        userId: socket.id,
        nickname: user.nickname,
        isTyping: payload.isTyping
      }, { except: [socket.id] });
    }
  };
});

// Handle raw disconnections (metadata not involved here)
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log(`User ${user.nickname} (${socket.id}) disconnected`);
      // Use the typed emitter for notification
      typedServer.userNotification({
        userId: socket.id,
        nickname: user.nickname,
        message: `${user.nickname} left the chat.`
      });
      delete users[socket.id];
    }
  });

  //when client connects, send welcome message
  console.log(`Client ${socket.id} connected`);
  typedServer.notification({
    type: 'welcome',
    message: 'Welcome to the chat!'
  }, { to: socket.id });
  
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});

// Print help message
console.log(`
Chat Server is running!

To test with client:
1. Open another terminal
2. Run: yarn workspace ts-socketio-example-basic-chat dev:client
`); 