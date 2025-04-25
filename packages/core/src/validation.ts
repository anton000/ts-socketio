import { EventDefinition, InferPayload, InferResponse } from './types';

/**
 * Validates data against the payload schema of an event definition.
 * If no schema is defined, it allows the data through but types it appropriately (void if data is null/undefined).
 * Throws a ZodError if data is present and invalid according to the schema.
 *
 * @param eventDef The event definition containing the optional schema.
 * @param data The raw data received.
 * @returns The validated data, potentially typed as void.
 */
export function validatePayload<TEventDef extends EventDefinition>(
  eventDef: TEventDef,
  data: unknown
): InferPayload<TEventDef> {
  if (eventDef.payload) {
    // Schema exists, parse the data
    return eventDef.payload.parse(data);
  }

  // No payload schema
  if (data === undefined || data === null) {
    // Data is absent, return undefined typed as the inferred void type
    return undefined as InferPayload<TEventDef>;
  }

  // Data is present, but no schema to validate against.
  // Return the data as is, typed to match the expected (void or inferred any).
  // This allows sending non-null/undefined data even if schema is undefined,
  // though typically payload would be omitted entirely in that case.
  return data as InferPayload<TEventDef>;
}

/**
 * Validates data against the response schema of an event definition.
 * If no schema is defined, it allows the data through but types it appropriately (void if data is null/undefined).
 * Throws a ZodError if data is present and invalid according to the schema.
 *
 * @param eventDef The event definition containing the optional schema.
 * @param data The raw data received.
 * @returns The validated data, potentially typed as void.
 */
export function validateResponse<TEventDef extends EventDefinition>(
  eventDef: TEventDef,
  data: unknown
): InferResponse<TEventDef> {
  if (eventDef.response) {
    // Schema exists, parse the data
    return eventDef.response.parse(data);
  }

  // No response schema
  if (data === undefined || data === null) {
    // Data is absent, return undefined typed as the inferred void type
    return undefined as InferResponse<TEventDef>;
  }

  // Data is present, but no schema to validate against.
  return data as InferResponse<TEventDef>;
} 