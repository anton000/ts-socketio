import { createServer } from 'http';
import { Server } from 'socket.io';
import { createTypedSocketServer } from '@ts-socketio/server';
import { chatContract } from './contract';

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

// Create our typed Socket.IO server
const typedServer = createTypedSocketServer(io);

// Register contract handlers
typedServer.registerContractHandlers(chatContract, (server) => {
  console.log('Registering chat handlers');
  return {
    // Handle setNickname event
    setNickname: async ({ payload, socket }) => {
      console.log(`User ${socket.id} wants nickname: ${payload.nickname}`);
      
      // Store the user with the requested nickname
      const nickname = payload.nickname.trim();
      users[socket.id] = {
        id: socket.id,
        nickname
      };
      
      // Notify all users about the new user
      server.userNotification({
        userId: socket.id,
        nickname,
        message: `${nickname} joined the chat.`
      });
      
      // Return success response
      return {
        success: true,
        message: 'Nickname set successfully',
        assignedNickname: nickname
      };
    },
    
    // Handle incoming messages
    sendMessage: ({ payload, socket }) => {
      const user = users[socket.id];
      if (!user) {
        console.warn(`Message from unknown user ${socket.id}`);
        return;
      }
      
      console.log(`Message from ${user.nickname}: ${payload.text}`);
      
      // Broadcast message to all clients with sender info
      server.sendMessage({
        text: payload.text,
        senderId: socket.id,
        senderNickname: user.nickname
      });
    },
    
    // Handle typing indicators
    typing: ({ payload, socket }) => {
      const user = users[socket.id];
      if (!user) return;
      
      // Broadcast typing status to all other clients
      // Use the contract-defined typingStatus event
      server.typingStatus({
        userId: socket.id,
        nickname: user.nickname,
        isTyping: payload.isTyping
      });
    }
  };
});

// Handle disconnections outside the contract (could be added to contract if desired)
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log(`User ${user.nickname} (${socket.id}) disconnected`);
      
      // Use a type assertion since TypeScript can't track the dynamic registration of handlers
      (typedServer as any).userNotification({
        userId: socket.id,
        nickname: user.nickname,
        message: `${user.nickname} left the chat.`
      });
      
      // Remove from users
      delete users[socket.id];
    }
  });
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