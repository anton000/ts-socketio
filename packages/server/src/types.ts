import { Server, Socket } from 'socket.io';
import {
    SocketContract,
    EventDefinition,
    EventDefinitions,
    InferPayload,
    InferResponse,
    MessageMetadata,
    DirectionalContractDefinition
} from '@ts-socketio/core';

// --- Utility Types ---

export type ContractClientEvents<TContract extends SocketContract> = TContract['clientEvents'];
export type ContractServerEvents<TContract extends SocketContract> = TContract['serverEvents'];

// --- RPC-Style Emitter Types (for Server -> Client) ---

/**
 * Function signature for server emitters (broadcasting events to clients).
 * Server emitters are always fire-and-forget (no acknowledgements).
 */
export type ServerEventEmitter<TEventDef extends EventDefinition> =
  (payload: InferPayload<TEventDef>) => void;

/**
 * Maps server event names to their corresponding emitter functions.
 */
export type ServerEmitters<TServerEvents extends EventDefinitions> = {
  [K in keyof TServerEvents]: ServerEventEmitter<TServerEvents[K]>;
};

// --- Event Handler Types (for Client -> Server) ---

/**
 * Context passed to server-side event handlers when processing client events.
 */
export interface EventHandlerContext<TPayload = unknown> {
  /** The validated payload data. */
  payload: TPayload;
  /** Metadata about the message (currently a placeholder). */
  metadata: MessageMetadata;
  /** The raw Socket.IO socket instance for this connection. */
  socket: Socket;
  /** The raw Socket.IO server instance. */
  io: Server;
}

/**
 * Function signature for server-side event handlers.
 * Handlers receive a context object and may return a response (or Promise thereof)
 * if the client event expects an acknowledgement.
 */
export type ServerEventHandler<TEventDef extends EventDefinition> =
  (context: EventHandlerContext<InferPayload<TEventDef>>) =>
    Promise<InferResponse<TEventDef>> | InferResponse<TEventDef>;

/**
 * An object mapping client event names to their corresponding handler functions.
 * The mapping is partial because handlers are optional (some events might not need handlers).
 */
export type EventHandlers<TClientEvents extends EventDefinitions> = {
  [K in keyof TClientEvents]?: ServerEventHandler<TClientEvents[K]>;
};

// --- Typed Socket Server Interface ---

/**
 * Base interface for the type-safe Socket.IO server instance.
 */
export interface TypedSocketServerBase<_ extends SocketContract> {
  /** The raw Socket.IO Server instance for accessing lower-level functionality. */
  readonly io: Server;

  /**
   * Registers handlers for client-initiated events defined in the contract.
   *
   * @param contract The processed contract object.
   * @param handlerFactory A factory function that receives the typed server instance and returns event handlers.
   */
  registerContractHandlers<
    TContractDef extends DirectionalContractDefinition,
    TProcessedContract extends SocketContract & { definition: TContractDef }
  >(
    contract: TProcessedContract,
    handlerFactory: (server: TypedSocketServer<TProcessedContract>) => EventHandlers<ContractClientEvents<TProcessedContract>>
  ): void;
}

/**
 * The complete type-safe Socket.IO server instance, combining the base interface with 
 * the dynamically generated server emitter functions based on the contract.
 */
export type TypedSocketServer<TContract extends SocketContract> = 
  TypedSocketServerBase<TContract> & ServerEmitters<ContractServerEvents<TContract>>; 