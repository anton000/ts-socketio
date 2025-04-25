import {
  DirectionalContractDefinition,
  EventDefinition,
  EventDefinitions,
  SharedEvents
} from './types';

/**
 * Processes a DirectionalContractDefinition into a normalized structure
 * containing combined client and server events.
 *
 * @param definition The directional contract definition using Zod schemas.
 * @returns An object containing the original definition and separated, combined event definitions for client and server.
 */
export function defineSocketContract<
  TDef extends DirectionalContractDefinition
>(
  definition: TDef
): {
  definition: TDef;
  clientEvents: NonNullable<TDef['Client']> & SharedEvents<TDef>;
  serverEvents: NonNullable<TDef['Server']> & SharedEvents<TDef>;
} {
  const sharedEvents: EventDefinitions = {};
  const clientOnlyEvents = definition.Client ?? {};
  const serverOnlyEvents = definition.Server ?? {};

  // Extract shared events (top-level keys not 'Client' or 'Server')
  for (const key in definition) {
    if (key !== 'Client' && key !== 'Server') {
      const potentialEvent = definition[key];
      // Basic check to see if it looks like an EventDefinition
      if (
        potentialEvent &&
        typeof potentialEvent === 'object' &&
        (!('Client' in potentialEvent) && !('Server' in potentialEvent)) && // Ensure it's not nested directional def
        (
          ('payload' in potentialEvent) ||
          ('response' in potentialEvent) ||
          // Allow empty objects as valid event defs (fire-and-forget with no payload)
          (Object.keys(potentialEvent).length === 0 && !potentialEvent.payload && !potentialEvent.response)
        )
      ) {
         sharedEvents[key] = potentialEvent as EventDefinition;
      } else if (potentialEvent && typeof potentialEvent === 'object' && (key in definition)) {
          // Avoid warning for Client/Server keys, warn for other unexpected object structures
          if(key !== 'Client' && key !== 'Server') {
            console.warn(`[ts-socketio] Ignoring non-EventDefinition property '${key}' in contract definition's top level.`);
          }
      }
    }
  }

  const clientEvents = { ...clientOnlyEvents, ...sharedEvents };
  const serverEvents = { ...serverOnlyEvents, ...sharedEvents };

  // Type assertions are used here because TypeScript struggles to perfectly infer
  // the combination of specific keys (Client/Server) and generic index signatures ([eventName: string])
  // with the merging logic. The runtime logic correctly separates and combines the events.
  return {
    definition,
    clientEvents: clientEvents as any,
    serverEvents: serverEvents as any,
  };
} 