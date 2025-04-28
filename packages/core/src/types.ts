import { ZodSchema, ZodTypeDef, ZodObject } from 'zod';

// Re-export Zod for convenience
export * as z from 'zod';

// --- Basic Event Definitions ---

/**
 * Defines the schema for a single event, including optional payload and response (ack).
 * ZodSchema<any> is used to allow any Zod type.
 */
export interface EventDefinition<Payload = any, Response = any> {
  payload?: ZodSchema<Payload, ZodTypeDef, Payload>;
  response?: ZodSchema<Response, ZodTypeDef, Response>;
}

/**
 * A record mapping event names (strings) to their EventDefinition.
 */
export type EventDefinitions = Record<string, EventDefinition>;

// --- Contract Structure ---

/**
 * Defines the contract structure, separating events by direction.
 * Allows top-level shared events alongside Client/Server categories.
 */
export interface DirectionalContractDefinition {
  /** Events emitted by the client and listened to by the server. */
  Client?: EventDefinitions;
  /** Events emitted by the server and listened to by the client. */
  Server?: EventDefinitions;
  /** Events that can be emitted/listened to by both client and server. */
  [eventName: string]: EventDefinition | EventDefinitions | undefined; // Allows top-level shared events
}

/**
 * Options for defining a socket contract.
 */
export interface ContractOptions<TCustomMeta extends object = {}> {
    /** Optional Zod schema for validating custom user-defined metadata. */
    metadataSchema?: ZodObject<any, any, any, TCustomMeta>; // Ensure it's an object schema
}

/**
 * Represents the fully defined contract object returned by defineSocketContract.
 * It includes the event definitions and the options used.
 */
export interface TypedSocketContract<TDef extends DirectionalContractDefinition = DirectionalContractDefinition, TOpts extends ContractOptions = ContractOptions> {
  readonly definition: TDef;
  readonly options?: TOpts;
}

// --- Metadata --- 

/**
 * Internal base metadata fields automatically added by the library.
 */
export interface InternalMessageMetadata {
  /** Unique identifier for the message, generated using uuid v4. */
  readonly messageId: string; // Always present
  /** Timestamp (ms since epoch) when the client generated the message. Added by client library. */
  readonly clientTimestamp?: number;
  /** Timestamp (ms since epoch) when the server received/processed the message. Added by server library. */
  readonly serverTimestamp?: number;
  /** Timestamp (ms since epoch) when the client received a message from the server. Added by client library. */
  readonly clientReceiveTimestamp?: number;
}

/**
 * The user-facing metadata type, combining internal fields with optional custom metadata.
 * TCustomMeta should be an object type, inferred from the contract's metadataSchema.
 * Defaults to an empty object if no custom metadata schema is provided.
 */
export type MessageMetadata<TCustomMeta extends object | {} = {}> = InternalMessageMetadata & TCustomMeta;

// --- Utility Types ---

/**
 * Utility type to infer the payload type from an EventDefinition.
 * Defaults to `void` if no payload schema is defined.
 */
export type InferPayload<TEventDef extends EventDefinition | undefined> =
  TEventDef extends EventDefinition<infer P> ? P : void;

/**
 * Utility type to infer the response type (for ACKs) from an EventDefinition.
 * Defaults to `void` if no response schema is defined.
 */
export type InferResponse<TEventDef extends EventDefinition | undefined> =
  TEventDef extends EventDefinition<any, infer R> ? R : void;

/**
 * Utility type to infer the custom metadata type from ContractOptions.
 * Defaults to an empty object `{}` if no metadataSchema is defined.
 */
export type InferCustomMetadata<TOpts extends ContractOptions | undefined> =
  TOpts extends ContractOptions<infer M> ? M : {};

/**
 * Helper type to extract shared events (top-level keys excluding 'Client' and 'Server')
 * Used internally by defineSocketContract and tsParseServerEvents.
 */
export type SharedEvents<TDef extends DirectionalContractDefinition> = Omit<TDef, 'Client' | 'Server'>;

// --- Exports requested by NestJS package build ---

/** Alias for TypedSocketContract for clarity where just the contract interface is needed. */
export type SocketContract = TypedSocketContract;

/** Represents the { payload, metadata } envelope structure. */
export interface MessageEnvelope<P = any, M = any> {
    payload: P;
    metadata: M;
}

/** Base type for Socket.IO event maps. */
export type DefaultSocketEventMap = Record<string, (...args: any[]) => void>; 