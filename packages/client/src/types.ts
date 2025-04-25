import { z } from 'zod';
import { Socket } from 'socket.io-client';
import {
    SocketContract,
    EventDefinition,
    EventDefinitions,
    InferPayload,
    InferResponse,
    MessageMetadata
} from '@ts-socketio/core';

// --- Utility Types ---

export type ContractClientEvents<TContract extends SocketContract> = TContract['clientEvents'];
export type ContractServerEvents<TContract extends SocketContract> = TContract['serverEvents'];

export type ReservedClientPropertyNames = 'socket' | 'contract' | 'options' | 'listeners' | 'emit' | 'on' | 'once' | 'off' | 'connect' | 'disconnect';

// --- RPC-Style Emitter Types ---

export type ClientEventEmitter<TEventDef extends EventDefinition> =
  TEventDef['response'] extends z.ZodSchema<any>
    ? (payload: InferPayload<TEventDef>) => Promise<InferResponse<TEventDef>>
    : (payload: InferPayload<TEventDef>) => void;

export type ClientEmitters<TClientEvents extends EventDefinitions> = {
  [K in keyof TClientEvents]: ClientEventEmitter<TClientEvents[K]>;
};

// --- RPC-Style Listener Types ---

export type ClientListenerCallback<TEventDef extends EventDefinition> =
  (payload: InferPayload<TEventDef>, metadata: MessageMetadata) => void;

// Returns an unsubscribe function
export type ClientListenerRegistrar<TEventDef extends EventDefinition> =
  (callback: ClientListenerCallback<TEventDef>) => () => void;

export type ClientListeners<TServerEvents extends EventDefinitions> = {
  [K in keyof TServerEvents as `on${Capitalize<string & K>}`]: ClientListenerRegistrar<TServerEvents[K]>;
  // TODO: Consider adding `once<EventName>` methods?
};

// --- Typed Socket Client Interface ---

/**
 * Represents the type-safe Socket.IO client instance.
 */
export type TypedSocketClient<TContract extends SocketContract> = {
  /** The raw socket.io-client instance. Use for non-contract events or direct access. */
  readonly socket: Socket;
  /** The contract definition used by this client. */
  readonly contract: TContract;
  /** The options used during client creation. */
  readonly options?: object; // Keep options generic for now

  /** Provides type-safe methods for subscribing to server-to-client events. */
  readonly listeners: ClientListeners<ContractServerEvents<TContract>>;

  /** Connect the socket manually if autoConnect was false during creation. Returns the client instance for chaining. */
  connect: () => TypedSocketClient<TContract>;
  /** Disconnect the socket. Returns the client instance for chaining. */
  disconnect: () => TypedSocketClient<TContract>;

} & ClientEmitters<ContractClientEvents<TContract>>; // Merge RPC emitters directly onto the client type 