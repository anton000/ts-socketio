import { 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer, 
  MessageBody, 
  ConnectedSocket, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { 
  TypedServer, 
  TypedServerEmitter, 
  tsSocketioHandler, 
  InferResponse
} from '@ts-socketio/nestjs';
import { chatContract, ChatContractType } from './contract';

// Define constants for easier access to event SCHEMAS
const SetNicknameSchemas = chatContract.definition.Client!.setNickname;
const SendMessageSchemas = chatContract.definition.sendMessage;
const TypingSchemas = chatContract.definition.Client!.typing;

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
  // Inject the raw Socket.IO server
  @WebSocketServer()
  server!: Server;

  // Inject the type-safe emitter using our contract
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
      // Notify others using the typed emitter
      this.typedServer.userNotification({
        userId: client.id,
        nickname: user.nickname,
        message: `${user.nickname} left the chat.`
      });
    }
  }

  // --- Event Handlers ---

  @SubscribeMessage('setNickname')
  async handleSetNickname(
    @MessageBody() data: unknown,
    @ConnectedSocket() socket: Socket,
  ) {
    return tsSocketioHandler(
      // Pass the schemas object
      { payload: SetNicknameSchemas.payload, response: SetNicknameSchemas.response },
      data, 
      socket, 
      this.server, 
      async (ctx) => { 
        // Now context payload should be correctly inferred, no cast needed
        console.log(`[NestJS] User ${ctx.socket.id} wants nickname: ${ctx.payload.nickname}`);
        const nickname = ctx.payload.nickname.trim();
        users[ctx.socket.id] = { id: ctx.socket.id, nickname };

        this.typedServer.userNotification({
          userId: ctx.socket.id,
          nickname,
          message: `${nickname} joined the chat.`
        });

        // Return type should match ResponseSchema
        const response: InferResponse<typeof SetNicknameSchemas> = { 
          success: true, 
          message: 'OK', 
          assignedNickname: nickname 
        };
        return response;
      }
    );
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @MessageBody() data: unknown,
    @ConnectedSocket() socket: Socket,
  ) {
    return tsSocketioHandler(
      // Only pass payload schema as response is not defined
      { payload: SendMessageSchemas.payload }, 
      data, 
      socket, 
      this.server, 
      (ctx) => {
        // Context payload should be correctly inferred
        const user = users[ctx.socket.id];
        if (!user) return;
        console.log(`[NestJS] Message from ${user.nickname}: ${ctx.payload.text}`);

        this.typedServer.sendMessage({
          text: ctx.payload.text,
          senderId: ctx.socket.id,
          senderNickname: user.nickname
        });
      }
    );
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: unknown,
    @ConnectedSocket() socket: Socket,
  ) {
    return tsSocketioHandler(
      // Only pass payload schema as response is not defined
      { payload: TypingSchemas.payload },
      data, 
      socket, 
      this.server,
      (ctx) => {
        // Context payload should be correctly inferred
        const user = users[ctx.socket.id];
        if (!user) return;

        this.typedServer.typingStatus({
          userId: ctx.socket.id,
          nickname: user.nickname,
          isTyping: ctx.payload.isTyping
        });
      }
    );
  }
} 