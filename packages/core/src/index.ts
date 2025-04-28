// Re-export Zod for convenience
export { z } from 'zod';

// Export core types and interfaces
export * from './types';

// Explicitly exporting missing types if not covered by wildcard
export type {
    SocketContract, 
    MessageEnvelope, 
    DefaultSocketEventMap, 
    InternalMessageMetadata // Export this too, used in nestjs handler
} from './types';

// Export contract definition function
export * from './contract';

// Export validation functions
export * from './validation';
