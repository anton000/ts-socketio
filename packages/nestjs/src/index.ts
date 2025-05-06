// Export Decorators
export { TypedServer } from './decorators/typed-server.decorator';
export { TsSocketHandler } from './decorators/ts-socket-handler.decorator';
export { TsMeta } from './decorators/ts-meta.decorator';
// Export Types
export type { TypedServerEmitter, EventHandlerParams } from './types';

// Export Provider
export { TsSocketProvider } from './ts-socket.provider';

// Export Parser
export { tsParseServerEvents } from '@ts-socketio/server';

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
