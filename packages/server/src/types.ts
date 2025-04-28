import { Server, Socket } from 'socket.io';
import {
    TypedSocketContract,
    EventDefinition,
    EventDefinitions,
    InferPayload,
    InferResponse,
    InferCustomMetadata,
    MessageMetadata,
    DirectionalContractDefinition,
    SharedEvents
} from '@ts-socketio/core';

// --- Utility Types to Extract Event Definitions from Contract --- 

// Extracts Client events + Shared events (relevant for server handlers)
export type ServerHandlerEvents<TDef extends DirectionalContractDefinition> = 
    NonNullable<TDef['Client']> & SharedEvents<TDef>;

// Define and export ServerSideEventDefinitions (combination of Client and Shared events)
export type ServerSideEventDefinitions<TDef extends DirectionalContractDefinition> = 
    ServerHandlerEvents<TDef>;

// Extracts Server events + Shared events (relevant for server emitters)
export type ServerEmitterEvents<TDef extends DirectionalContractDefinition> = 
    NonNullable<TDef['Server']> & SharedEvents<TDef>;

// --- RPC-Style Emitter Types (for Server -> Client) ---

/**
 * Function signature for server emitters (broadcasting events to clients).
 * Takes the payload and optional emit options.
 * Sends an envelope { payload, metadata }.
 */
export type ServerEventEmitter<TEventDef extends EventDefinition> = 
    (payload: InferPayload<TEventDef>, options?: BroadcastOptions) => void;

/**
 * Maps server-emit event names to their corresponding emitter functions.
 */
export type ServerEmitters<TEmitterEvents extends EventDefinitions> = {
    [K in keyof TEmitterEvents]: ServerEventEmitter<TEmitterEvents[K]>;
};

// --- Event Handler Types (for Client -> Server) ---

/**
 * Context passed to server-side event handlers when processing client events.
 * Generic over the Payload type and the Custom Metadata type.
 */
export interface EventHandlerContext<TPayload = unknown, TCustomMeta extends object = {}> {
  /** The validated payload data. */
  payload: TPayload;
  /** The combined internal and custom metadata, validated if schema was provided. */
  metadata: MessageMetadata<TCustomMeta>;
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
export type ServerEventHandler<TEventDef extends EventDefinition, TCustomMeta extends object = {}> = 
  (context: EventHandlerContext<InferPayload<TEventDef>, TCustomMeta>) =>
    Promise<InferResponse<TEventDef>> | InferResponse<TEventDef>;

/**
 * An object mapping client-initiated event names to their corresponding handler functions.
 */
export type EventHandlers<THandlerEvents extends EventDefinitions, TCustomMeta extends object = {}> = {
  // Use mapped type to create optional handler functions for each client/shared event
  [K in keyof THandlerEvents]?: ServerEventHandler<THandlerEvents[K], TCustomMeta>;
};

// --- Metadata Provider --- 

/**
 * Function signature for the metadata provider callback.
 * Called before an event is emitted by the server.
 * Should return the custom metadata object.
 */
export type ServerMetadataProvider<TCustomMeta extends object = {}> = 
    (eventName: string, payload: any, target?: any) => TCustomMeta | Promise<TCustomMeta>;

// --- Typed Socket Server Interface ---

/**
 * Base interface for the type-safe Socket.IO server instance.
 * Generic over the full contract definition and options.
 */
export interface TypedSocketServerBase<TContract extends TypedSocketContract> {
  /** The raw Socket.IO Server instance for accessing lower-level functionality. */
  readonly io: Server;
  /** The processed contract object. */
  readonly contract: TContract;

  /**
   * Registers handlers for client-initiated events defined in the contract.
   *
   * @param handlerFactory A factory function that receives the typed server instance (emitters) and returns event handlers.
   */
  registerContractHandlers(
    handlerFactory: (
        server: ServerEmitters<ServerEmitterEvents<TContract['definition']>>
    ) => EventHandlers<ServerHandlerEvents<TContract['definition']>, InferCustomMetadata<TContract['options']>>
  ): void;

  /**
   * Registers a provider function to generate custom metadata for server-emitted events.
   *
   * @param provider The function to call before emitting server events.
   */
  setMetadataProvider(
      provider: ServerMetadataProvider<InferCustomMetadata<TContract['options']>>
  ): void;
}

/**
 * The complete type-safe Socket.IO server instance, combining the base interface with 
 * the dynamically generated server emitter functions based on the contract.
 */
export type TypedSocketServer<TContract extends TypedSocketContract> = 
  TypedSocketServerBase<TContract> & 
  ServerEmitters<ServerEmitterEvents<TContract['definition']>>;

// TODO: Define BroadcastOptions more concretely (e.g., from socket.io types)
export interface BroadcastOptions {
    to?: string | string[];
    except?: string | string[];
    // Add other relevant socket.io broadcast flags/options
} 