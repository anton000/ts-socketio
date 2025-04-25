// Export the factory function
export { createTypedSocketClient } from './client';

// Export the main client type and potentially other useful types
export type { TypedSocketClient, ClientListenerCallback } from './types';

// Potentially re-export core types if commonly needed by client users
// export type { InferPayload, InferResponse, MessageMetadata } from '@ts-socketio/core';
