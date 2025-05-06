import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { TsSocketProvider } from '@ts-socketio/nestjs';
import { ChatService } from './chat.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    ChatGateway,
    TsSocketProvider,
    ChatService,
  ], // Include our WebSocket gateway
})
export class AppModule {} 