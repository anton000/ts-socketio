import { z } from 'zod';
import type {
    TypedSocketContract,
    EventDefinition,
    ContractOptions
} from '@ts-socketio/core';
import type { 
    ServerSideEventDefinitions
} from './types'; 

/**
 * Represents schema information for a specific event
 */
export interface EventSchemas {
    /**
     * The Zod schema for validating the event payload (if defined in the contract)
     * Note: The specific Zod schema type (ZodObject, ZodString, etc.) will be preserved at runtime
     * but TypeScript may show it as a generic ZodType during development
     */
    payload?: z.ZodType<any>;
    
    /**
     * The Zod schema for validating the event response (if defined in the contract)
     * Note: The specific Zod schema type will be preserved at runtime
     * but TypeScript may show it as a generic ZodType during development
     */
    response?: z.ZodType<any>;
}

/**
 * Original nested schema format (kept for backwards compatibility)
 * @internal
 */
export type ParsedEventSchemas<TEvents extends Record<string, EventDefinition>> = {
    [K in keyof TEvents]: EventSchemas;
};

/**
 * Complete result from parsing a contract for server-side use
 */
export interface ParsedServerEvents<TContract extends TypedSocketContract> {
    /**
     * Event definitions relevant for server-side handling (Client→Server and shared events)
     */
    serverContract: ServerSideEventDefinitions<TContract['definition']>;
    
    /**
     * The custom metadata schema if defined in the contract options
     */
    customMetadataSchema?: TContract['options'] extends ContractOptions<infer M> ? z.ZodObject<any, any, any, M> : undefined;

    /**
     * Get the payload and response schemas for a specific event
     * 
     * @example
     * ```ts
     * const { payload, response } = parsedContract.getSchema('eventName');
     * if (payload) {
     *   const result = payload.safeParse(data);
     * }
     * ```
     * 
     * @param eventName - The name of the event to get schemas for
     * @returns An object containing the payload and response schemas (if defined)
     */
    getSchema(eventName: string): { 
        payload?: z.ZodType<any>;
        response?: z.ZodType<any>;
    };
}

/**
 * Parses a TypedSocketContract to extract definitions and schemas 
 * relevant for server-side event handling (Client → Server and Shared events).
 * 
 * This function simplifies working with contract schemas by providing:
 * 1. A flattened view of client-to-server event definitions
 * 2. A getSchema() function for accessing payload and response schemas directly
 * 3. Access to the custom metadata schema if defined in the contract
 *
 * @example
 * ```ts
 * // Extract event definitions, schema accessor and metadata schema
 * const { serverContract, getSchema, customMetadataSchema } = tsParseServerEvents(myContract);
 * 
 * // Use getSchema() to access payload and response schemas
 * const { payload, response } = getSchema('setNickname');
 * if (payload) {
 *   const result = payload.safeParse(data);
 * }
 * 
 * // Check if custom metadata schema is available
 * if (customMetadataSchema) {
 *   const metaResult = customMetadataSchema.safeParse(metadata);
 * }
 * ```
 * 
 * @param contract - The TypedSocketContract instance.
 * @returns An object containing server-relevant event definitions and schema accessor.
 */
export function tsParseServerEvents<TContract extends TypedSocketContract>(
    contract: TContract
): ParsedServerEvents<TContract> {
    
    const serverSideDefs: Partial<ServerSideEventDefinitions<TContract['definition']>> = {};
    // For flat schema access
    const schemaObj: Record<string, EventSchemas> = {};

    const addEvent = (key: string, eventDef: EventDefinition<any, any>) => {
        if (eventDef && typeof key === 'string') { 
            const eventName = key as keyof ServerSideEventDefinitions<TContract['definition']>;
            serverSideDefs[eventName] = eventDef as any; 
            
            // Add to the flat access structure
            schemaObj[key] = {
                payload: eventDef.payload,
                response: eventDef.response
            };
        }
    };

    // Add Client -> Server events
    if (contract.definition.Client) {
        for (const key in contract.definition.Client) {
            if (Object.prototype.hasOwnProperty.call(contract.definition.Client, key)) {
                const eventDef = contract.definition.Client[key];
                if (eventDef) {
                     addEvent(key, eventDef);
                }
            }
        }
    }
    
    // Add Shared events (top-level keys excluding Client/Server)
    const definition = contract.definition;
    for (const key in definition) {
        if (key !== 'Client' && key !== 'Server' && Object.prototype.hasOwnProperty.call(definition, key)) {
            const potentialEvent = definition[key];
            if (potentialEvent && typeof potentialEvent === 'object' && 
                ('payload' in potentialEvent || 'response' in potentialEvent) && 
                !(potentialEvent instanceof z.ZodSchema) )
            { 
                 addEvent(key, potentialEvent as EventDefinition<any, any>);
            }
        }
    }

    // Get custom metadata schema safely
    const customMetadataSchema = contract.options?.metadataSchema;

    return {
        serverContract: serverSideDefs as ServerSideEventDefinitions<TContract['definition']>,
        customMetadataSchema: customMetadataSchema as any,
        getSchema(eventName) {
            const eventDef = serverSideDefs[eventName];
            if (!eventDef) return { payload: undefined, response: undefined };
            return {
                payload: (eventDef as EventDefinition).payload,
                response: (eventDef as EventDefinition).response
            };
        }
    };
} 