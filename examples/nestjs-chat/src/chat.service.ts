import { Injectable } from "@nestjs/common";
import { TsSocketProvider, TypedServerEmitter } from "@ts-socketio/nestjs";
import { ChatContractType } from "./contract";

@Injectable()
export class ChatService {
  private emitter!: TypedServerEmitter<ChatContractType>;
  
  constructor(private tsSocketProvider: TsSocketProvider) {
  }

  async onModuleInit() {
    this.emitter =  await this.tsSocketProvider.getEmitter();
  }

  async testEmitter() {
    this.emitter.userNotification({
      nickname: 'John Doe',
      message: 'Hello, from service!',
      userId: '1',
    });
  } 
}
