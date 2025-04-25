// Export the server factory function
export { createTypedSocketServer } from './server';

// Export the main server types
export type {
  TypedSocketServer,
  EventHandlerContext,
  EventHandlers,
  ContractClientEvents,
  ContractServerEvents,
  ServerEmitters
} from './types';

// Re-export core types that might be useful for server users
// export type { InferPayload, InferResponse } from '@ts-socketio/core';
