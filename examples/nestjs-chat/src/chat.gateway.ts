import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { 
  TypedServer, 
  TypedServerEmitter, 
  TsSocketHandler,       
  tsParseServerEvents,   
  InferPayload
} from '@ts-socketio/nestjs';
import { chatContract, ChatContractType } from './contract';
//import { z } from 'zod';

// Parse the contract as per the outline
const { serverContract } = tsParseServerEvents(chatContract);

// In-memory store (same as basic-chat example)
interface User {
  id: string;
  nickname: string;
}
const users: Record<string, User> = {};

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all origins for example
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  @TypedServer(chatContract)
  typedServer!: TypedServerEmitter<ChatContractType>;

  // --- Lifecycle Hooks ---
  handleConnection(client: Socket) {
    console.log(`[NestJS] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const user = users[client.id];
    if (user) {
      console.log(`[NestJS] Client disconnected: ${user.nickname} (${client.id})`);
      delete users[client.id];
      this.typedServer.userNotification({
        userId: client.id,
        nickname: user.nickname,
        message: `${user.nickname} left the chat.`
      });
    }
  }

  // --- Event Handlers (Using updated decorator) ---

  @TsSocketHandler(serverContract.setNickname)
  async handleSetNickname(ctx: any) { 
    console.log(`[NestJS] User ${ctx.socket.id} wants nickname: ${ctx.payload.nickname}`);
    console.log(`  Metadata: Msg ID: ${ctx.metadata.messageId}`);
    
    const nickname = ctx.payload.nickname.trim();
    users[ctx.socket.id] = { id: ctx.socket.id, nickname };

    this.typedServer.userNotification({
      userId: ctx.socket.id,
      nickname,
      message: `${nickname} joined the chat.`
    });

    return {
      success: true,
      message: 'OK',
      assignedNickname: nickname
    };
  }

  @TsSocketHandler(serverContract.sendMessage)
  async handleSendMessage(ctx: any) {
    const user = users[ctx.socket.id];
    if (!user) return;
    console.log(`[NestJS] Message from ${user.nickname}: ${ctx.payload.text}`);
    
    const broadcastPayload: InferPayload<ChatContractType['definition']['sendMessage']> = {
      text: ctx.payload.text,
      senderId: ctx.socket.id,
      senderNickname: user.nickname
    };
    this.typedServer.sendMessage(broadcastPayload);
  }

  @TsSocketHandler(serverContract.typing)
  async handleTyping(ctx: any) {
    const user = users[ctx.socket.id];
    if (!user) return;
    console.log(`[NestJS] Typing status from ${user.nickname}: ${ctx.payload.isTyping}`);
    
    this.typedServer.typingStatus({
      userId: ctx.socket.id,
      nickname: user.nickname,
      isTyping: ctx.payload.isTyping
    });
  }
} 