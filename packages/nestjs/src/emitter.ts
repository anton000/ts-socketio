import { Server } from 'socket.io';
import {
    SocketContract,
    InferPayload
} from '@ts-socketio/core';

/**
 * Internal implementation class for the typed server emitter.
 * It dynamically builds emitter methods based on the contract.
 */
export class TypedServerEmitterImpl<TContract extends SocketContract> {
  // Allow index signature to dynamically add emitter methods
  [key: string]: any;

  constructor(private io: Server, private contract: TContract) {
    this.buildEmitters();
  }

  private buildEmitters(): void {
    for (const eventName in this.contract.serverEvents) {
      if (Object.prototype.hasOwnProperty.call(this.contract.serverEvents, eventName)) {
        const eventDef = this.contract.serverEvents[eventName]!;

        // Add the type-safe emitter method to this instance
        this[eventName] = (payload: InferPayload<typeof eventDef>) => {
          // Optional: Validate payload before emitting?
          // try {
          //   validatePayload(eventDef, payload);
          // } catch (error) {
          //   console.error(`[ts-socketio/nestjs] Invalid payload for server event '${eventName}':`, error);
          //   return; // Don't emit invalid payload
          // }
          this.io.emit(eventName, payload);
        };
      }
    }
  }
}
