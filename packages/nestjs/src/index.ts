// Export Decorators
export { TypedServer } from './decorators/typed-server.decorator';
export { TsSocketHandler } from './decorators/ts-socket-handler.decorator';

// Export Parser
export { tsParseServerEvents } from '@ts-socketio/server';

// Export Types
export type { TypedServerEmitter } from './types';
export type { EventHandlerContext as SocketEventHandlerContext } from '@ts-socketio/server';

// Re-export key core types for convenience
export type { 
    TypedSocketContract,
    EventDefinition,
    DirectionalContractDefinition,
    MessageMetadata,
    InferPayload,
    InferResponse,
    InferCustomMetadata
} from '@ts-socketio/core';

// Re-export server types for convenience
export type {
    ParsedServerEvents,
    EventHandlerContext,
    ServerSideEventDefinitions,
    BroadcastOptions
} from '@ts-socketio/server';
