// Export Decorators
export { TypedServer } from './decorators';

// Export Handler Helper
export { tsSocketioHandler } from './handler';

// Export Types
export type { TypedServerEmitter, SocketEventHandlerContext } from './types';

// Re-export key core types for convenience
export type { EventDefinition, InferPayload, InferResponse } from '@ts-socketio/core';
