import { ZodSchema } from 'zod';

// --- Basic Event Definitions ---

/**
 * Defines the schema for a single event, including optional payload and response (ack).
 */
export interface EventDefinition {
  payload?: ZodSchema<any>;
  response?: ZodSchema<any>;
}

/**
 * A record mapping event names to their EventDefinition.
 */
export type EventDefinitions = Record<string, EventDefinition>;

// --- Contract Structure ---

/**
 * Defines the contract structure, separating events by direction.
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
 * Represents the fully processed contract with combined event definitions.
 */
export interface SocketContract {
  /** All events that can be emitted by the client. */
  clientEvents: EventDefinitions;
  /** All events that can be emitted by the server. */
  serverEvents: EventDefinitions;
  /** The original directional definition. */
  definition: DirectionalContractDefinition;
}

// --- Metadata --- 

/**
 * Metadata associated with a received message.
 */
export interface MessageMetadata {
  // Currently empty, placeholder for future additions like timestamp, sender info etc.
}

// --- Utility Types ---

/**
 * Utility type to infer the payload type from an EventDefinition.
 * Defaults to `void` if no payload schema is defined.
 */
export type InferPayload<TEventDef extends EventDefinition> =
  TEventDef['payload'] extends ZodSchema<infer P> ? P : void;

/**
 * Utility type to infer the response type from an EventDefinition.
 * Defaults to `void` if no response schema is defined.
 */
export type InferResponse<TEventDef extends EventDefinition> =
  TEventDef['response'] extends ZodSchema<infer R> ? R : void;

/**
 * Helper type to extract shared events (top-level keys excluding 'Client' and 'Server')
 * Used internally by defineSocketContract.
 */
export type SharedEvents<TDef extends DirectionalContractDefinition> = Omit<TDef, 'Client' | 'Server'>; 