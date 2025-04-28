import { z } from 'zod';
import { Socket } from 'socket.io-client';
import {
    TypedSocketContract,
    EventDefinition,
    EventDefinitions,
    DirectionalContractDefinition,
    InferPayload,
    InferResponse,
    InferCustomMetadata,
    MessageMetadata,
    SharedEvents
} from '@ts-socketio/core';

// --- Utility Types to Extract Event Definitions from Contract --- 

// Extracts Client events + Shared events (relevant for client emitters)
export type ClientEmitterEvents<TDef extends DirectionalContractDefinition> = 
    NonNullable<TDef['Client']> & SharedEvents<TDef>;

// Extracts Server events + Shared events (relevant for client listeners)
export type ClientListenerEvents<TDef extends DirectionalContractDefinition> = 
    NonNullable<TDef['Server']> & SharedEvents<TDef>;

// --- Reserved Names --- 
export type ReservedClientPropertyNames = 
    'socket' | 'contract' | 'options' | 'listeners' | 'setMetadataProvider' | 
    'emit' | 'on' | 'once' | 'off' | 'connect' | 'disconnect'; // Include new methods

// --- RPC-Style Emitter Types (Client -> Server) ---

/**
 * Function signature for client emitters.
 * Takes the payload.
 * Returns Promise<response> if ack is expected, otherwise void.
 * Sends an envelope { payload, metadata }.
 */
export type ClientEventEmitter<TEventDef extends EventDefinition> =
  TEventDef['response'] extends z.ZodSchema<any>
    ? (payload: InferPayload<TEventDef>) => Promise<InferResponse<TEventDef>>
    : (payload: InferPayload<TEventDef>) => void;

/**
 * Maps client-emit event names to their corresponding emitter functions.
 */
export type ClientEmitters<TEmitterEvents extends EventDefinitions> = {
  [K in keyof TEmitterEvents]: ClientEventEmitter<TEmitterEvents[K]>;
};

// --- RPC-Style Listener Types (Server -> Client) ---

/**
 * Function signature for the callback provided by the user to handle incoming events.
 * Receives the validated payload and the full MessageMetadata object.
 */
export type ClientListenerCallback<TPayload = any, TCustomMeta extends object = {}> =
  (payload: TPayload, metadata: MessageMetadata<TCustomMeta>) => void;

/**
 * Function signature for the listener registration method (e.g., `client.listeners.onUserEvent`).
 * Returns an unsubscribe function.
 */
export type ClientListenerRegistrar<TEventDef extends EventDefinition, TCustomMeta extends object = {}> =
  (callback: ClientListenerCallback<InferPayload<TEventDef>, TCustomMeta>) => () => void;

/**
 * An object containing the listener registration methods, named `on<EventName>`.
 */
export type ClientListeners<TListenerEvents extends EventDefinitions, TCustomMeta extends object = {}> = {
  [K in keyof TListenerEvents as `on${Capitalize<string & K>}`]: ClientListenerRegistrar<TListenerEvents[K], TCustomMeta>;
};

// --- Metadata Provider --- 

/**
 * Function signature for the client metadata provider callback.
 * Called before an event is emitted by the client.
 * Should return the custom metadata object.
 */
export type ClientMetadataProvider<TCustomMeta extends object = {}> = 
    (eventName: string, payload: any) => TCustomMeta | Promise<TCustomMeta>;

// --- Typed Socket Client Interface ---

/**
 * Represents the type-safe Socket.IO client instance.
 * Generic over the full contract.
 */
export type TypedSocketClient<TContract extends TypedSocketContract> = {
  /** The raw socket.io-client instance. Use for non-contract events or direct access. */
  readonly socket: Socket;
  /** The contract definition used by this client. */
  readonly contract: TContract;
  /** The options used during client creation (placeholder). */
  readonly options?: object; 

  /** Provides type-safe methods for subscribing to server-to-client events. */
  readonly listeners: ClientListeners<ClientListenerEvents<TContract['definition']>, InferCustomMetadata<TContract['options']>>;

  /** Connect the socket manually if autoConnect was false during creation. */
  connect: () => TypedSocketClient<TContract>;
  /** Disconnect the socket. */
  disconnect: () => TypedSocketClient<TContract>;

  /**
   * Registers a provider function to generate custom metadata for client-emitted events.
   */
  setMetadataProvider(
      provider: ClientMetadataProvider<InferCustomMetadata<TContract['options']>>
  ): void;

} & ClientEmitters<ClientEmitterEvents<TContract['definition']>>; // Merge RPC emitters directly onto the client type 