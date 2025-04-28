// Export the server factory function
export { createTypedSocketServer } from './server';

// Export the main server types
export type {
  TypedSocketServer,
  EventHandlerContext,
  EventHandlers,
  ServerEmitters,
  ServerEventHandler,
  ServerMetadataProvider,
  ServerEmitterEvents,
  BroadcastOptions,
  ServerHandlerEvents,
  ServerSideEventDefinitions
} from './types';

// Re-export core types that might be useful for server users
// export type { InferPayload, InferResponse } from '@ts-socketio/core';

export { tsParseServerEvents } from './utils';
export type { ParsedServerEvents } from './utils';
