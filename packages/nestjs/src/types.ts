import { Server, Socket } from 'socket.io';
import {
    SocketContract,
    MessageMetadata
} from '@ts-socketio/core';
import { ServerEmitters, ServerEmitterEvents } from '@ts-socketio/server';

/**
 * Represents the type-safe emitter object injected by the `@TypedServer` decorator.
 * It provides methods for emitting server-to-client events defined in the contract.
 */
export type TypedServerEmitter<TContract extends SocketContract> = 
    ServerEmitters<ServerEmitterEvents<TContract['definition']>>;

/**
 * Context object passed to the user's handler callback within `tsSocketioHandler`.
 */
export interface SocketEventHandlerContext<TPayload = unknown, TCustomMeta extends object = {}> {
  /** The Zod-validated payload data received from the client. */
  payload: TPayload;
  /** Metadata about the message (combines internal and custom). */
  metadata: MessageMetadata<TCustomMeta>;
  /** The raw Socket.IO socket instance for the client connection. */
  socket: Socket;
  /** The raw Socket.IO server instance. */
  io: Server;
}
