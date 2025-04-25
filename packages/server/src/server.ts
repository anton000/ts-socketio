import { Server } from 'socket.io';
import {
    DirectionalContractDefinition,
    SocketContract,
    InferPayload,
    validatePayload,
    validateResponse
} from '@ts-socketio/core';
import {
    TypedSocketServer,
    TypedSocketServerBase,
    EventHandlerContext
} from './types';

/**
 * Creates a type-safe Socket.IO server wrapper based on a shared contract.
 *
 * @param io The raw Socket.IO Server instance.
 * @param options Optional configuration (currently unused, placeholder for future features).
 * @returns A TypedSocketServer instance that must be completed by calling registerContractHandlers.
 */
export function createTypedSocketServer<
  TContractDef extends DirectionalContractDefinition,
  TProcessedContract extends SocketContract & { definition: TContractDef }
>(
  io: Server
): TypedSocketServer<TProcessedContract> {

  const typedServer: TypedSocketServerBase<TProcessedContract> = {
    io: io,

    // Implementation of registerContractHandlers
    registerContractHandlers(contract, handlerFactory) {
    const handlers = handlerFactory(typedServer as TypedSocketServer<TProcessedContract>);
    const clientEventDefs = contract.clientEvents;

      // Now that we have the contract, dynamically add the server emitters to typedServer
    for (const eventName in contract.serverEvents) {
      if (Object.prototype.hasOwnProperty.call(contract.serverEvents, eventName)) {
        const eventDef = contract.serverEvents[eventName]!;

          // Basic collision check against existing properties
          if (eventName in typedServer) {
            console.warn(`[ts-socketio-server] Event name collision: Cannot create emitter for '${eventName}' as property already exists on the server.`);
            continue; // Skip this emitter
        }

          // Add the type-safe emitter method to the server instance
        (typedServer as any)[eventName] = (payload: InferPayload<typeof eventDef>) => {
            io.emit(eventName, payload);
        };
      }
    }

      // Set up connection handler to register client event handlers for each socket
    io.on('connection', (socket) => {
      console.log(`[ts-socketio-server] Socket connected: ${socket.id}`);

        // Register handlers for this specific socket
      for (const eventName in handlers) {
        if (Object.prototype.hasOwnProperty.call(handlers, eventName)) {
          const handler = handlers[eventName];
            const eventDef = clientEventDefs[eventName]; // Get event definition from the contract

          if (handler && eventDef) {
              // Use type assertion to fix TypeScript error with socket.io's internal typings
              (socket.on as any)(eventName, async (rawPayload: unknown, ack?: (response: any) => void) => {
                // Prepare the context object that will be passed to the handler
                const context: EventHandlerContext = {
                  // We'll validate and assign the payload inside the try/catch
                  payload: undefined as any, // Temporary placeholder
                  metadata: {}, // Currently empty; could include timestamp, etc. in the future
                socket: socket,
                  io: io
              };

              try {
                  // Validate the incoming payload against the schema in eventDef
                  context.payload = validatePayload(eventDef, rawPayload);

                  // Call the user-defined handler with the validated context
                  const result = await handler(context as any);

                  // If the client is expecting a response (has provided an ack callback)
                if (ack) {
                  try {
                      // Validate the handler's response against the schema
                    const validatedResponse = validateResponse(eventDef, result);
                      ack(validatedResponse); // Send the response back to the client
                  } catch (validationError) {
                    console.error(`[ts-socketio-server] Error validating handler response for event '${eventName}':`, validationError);
                      // Could potentially send an error response
                      // ack({ error: 'Response validation failed' });
                  }
                } else if (eventDef.response) {
                    // If the event definition specifies a response but client didn't provide ack
                    console.warn(`[ts-socketio-server] Event '${eventName}' requires a response, but client did not provide an acknowledgement callback.`);
                }
              } catch (error) {
                console.error(`[ts-socketio-server] Error handling event '${eventName}':`, error);
                  // Could potentially send an error response
                  // if (ack) ack({ error: 'Internal server error' });
              }
            });
          }
        }
      }

        // Set up disconnect handler
        (socket.on as any)('disconnect', (reason: string) => {
        console.log(`[ts-socketio-server] Socket disconnected: ${socket.id}, reason: ${reason}`);
      });
    });
    }
  };

  // Return the server instance (emitters will be added upon calling registerContractHandlers)
  return typedServer as TypedSocketServer<TProcessedContract>;
} 