import { Server, Socket } from 'socket.io';
import {
    SocketContract,
    MessageMetadata
} from '@ts-socketio/core';
import { ServerEmitters, ContractServerEvents } from '@ts-socketio/server'; // Import from server types

/**
 * Represents the type-safe emitter object injected by the `@TypedServer` decorator.
 * It provides methods for emitting server-to-client events defined in the contract.
 */
export type TypedServerEmitter<TContract extends SocketContract> = 
    ServerEmitters<ContractServerEvents<TContract>>;

/**
 * Context object passed to the user's handler callback within `tsSocketioHandler`.
 */
export interface SocketEventHandlerContext<TPayload = unknown> {
  /** The Zod-validated payload data received from the client. */
  payload: TPayload;
  /** Metadata about the message (currently a placeholder). */
  metadata: MessageMetadata;
  /** The raw Socket.IO socket instance for the client connection. */
  socket: Socket;
  /** The raw Socket.IO server instance. */
  io: Server;
}
