import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
    TypedSocketContract,
    ContractOptions,
    DirectionalContractDefinition,
    EventDefinition,
    InferCustomMetadata,
    InternalMessageMetadata,
    MessageMetadata,
    validatePayload,
    validateResponse,
    SharedEvents
} from '@ts-socketio/core';
import {
    TypedSocketServer,
    TypedSocketServerBase,
    EventHandlerContext,
    ServerMetadataProvider,
    BroadcastOptions // Assuming BroadcastOptions is defined correctly in types
} from './types';

/**
 * Creates a type-safe Socket.IO server wrapper based on a shared contract.
 *
 * @template TDef - The contract's event definition structure.
 * @template TCustomMeta - The custom metadata type.
 * @param {TypedSocketContract<TDef, ContractOptions<TCustomMeta>>} contract - The defined contract.
 * @param {Server} io - The raw Socket.IO Server instance.
 * @param {any} _options - Optional configuration (placeholder).
 * @returns {TypedSocketServer<TypedSocketContract<TDef, ContractOptions<TCustomMeta>>>} A type-safe server instance.
 */
export function createTypedSocketServer<
    TDef extends DirectionalContractDefinition,
    TCustomMeta extends object = {}
>(
    contract: TypedSocketContract<TDef, ContractOptions<TCustomMeta>>,
  io: Server,
    _options?: any // Placeholder for future options
): TypedSocketServer<TypedSocketContract<TDef, ContractOptions<TCustomMeta>>> {

    type ThisContract = TypedSocketContract<TDef, ContractOptions<TCustomMeta>>;
    type ThisCustomMeta = InferCustomMetadata<ThisContract['options']>;

    let metadataProvider: ServerMetadataProvider<ThisCustomMeta> | null = null;

    // --- Create Base Server Object --- 
    const typedServerBase: TypedSocketServerBase<ThisContract> = {
    io: io,
        contract: contract,

        setMetadataProvider(provider) {
            metadataProvider = provider;
        },

        registerContractHandlers(handlerFactory) {
            const handlers = handlerFactory(typedServer as any); // Pass the fully formed server

    io.on('connection', (socket) => {
      console.log(`[ts-socketio-server] Socket connected: ${socket.id}`);

                // Register handlers for this socket
      for (const eventName in handlers) {
        if (Object.prototype.hasOwnProperty.call(handlers, eventName)) {
                        const handler = handlers[eventName as keyof typeof handlers] as any;
                        const eventDef = (contract.definition.Client?.[eventName] ?? contract.definition[eventName]) as EventDefinition | undefined;

          if (handler && eventDef) {
                            socket.on(eventName, async (envelope: unknown, ack?: (response: any) => void) => {

                                // --- Envelope Unwrapping and Basic Validation ---
                                if (typeof envelope !== 'object' || envelope === null || !('payload' in envelope) || !('metadata' in envelope)) {
                                    console.error(`[ts-socketio-server] Received malformed envelope for event '${eventName}'. Expected { payload, metadata }. Got:`, envelope);
                                    // TODO: Maybe send error via ack if available?
                                    return;
                                }
                                const rawPayload = (envelope as any).payload;
                                const rawMetadata = (envelope as any).metadata as InternalMessageMetadata & Partial<ThisCustomMeta>; // Trust incoming base meta shape for now
                                
                                const serverTimestamp = Date.now();
                                const finalMetadata: MessageMetadata<ThisCustomMeta> = {
                                    ...rawMetadata,
                                    serverTimestamp,
                                };

                                // --- Prepare Context --- 
                                const context: EventHandlerContext<any, ThisCustomMeta> = {
                                    payload: undefined, // Will be validated next
                                    metadata: finalMetadata, // Includes potentially unvalidated custom meta
                socket: socket,
                                    io: io
              };

              try {
                                    // --- Payload Validation --- 
                                    context.payload = validatePayload(eventDef, rawPayload);

                                    // --- Custom Metadata Validation (if schema provided) ---
                                    const customMetaSchema = contract.options?.metadataSchema;
                                    if (customMetaSchema) {
                                        const parseResult = customMetaSchema.safeParse(finalMetadata); // Validate custom part
                                        if (!parseResult.success) {
                                            throw new Error(`Custom metadata validation failed: ${parseResult.error.message}`);
                                        }
                                        // Ensure context.metadata has the strictly validated custom part
                                        context.metadata = { ...finalMetadata, ...parseResult.data };
                                    }

                                    // --- Call User Handler --- 
                                    const result = await handler(context as any); // Pass fully prepared context

                                    // --- ACK Handling --- 
                if (ack) {
                  if (!eventDef.response) {
                                            console.warn(`[ts-socketio-server] Event '${eventName}' received ACK, but no response schema is defined in contract.`);
                                            ack(undefined); // Acknowledge without data
                     return; 
                  }
                  try {
                    const validatedResponse = validateResponse(eventDef, result);
                    ack(validatedResponse);
                                        } catch (validationError: any) { 
                                            console.error(`[ts-socketio-server] Error validating handler response for '${eventName}':`, validationError?.message || validationError);
                                            // Maybe send error via ack? Needs careful design.
                                            // ack({ __tsError: 'Response validation failed', details: validationError?.message });
                  }
                } else if (eventDef.response) {
                                        console.warn(`[ts-socketio-server] Event '${eventName}' handler returned a value, but client did not provide an ACK callback.`);
                                    }
                                } catch (error: any) {
                                    console.error(`[ts-socketio-server] Error processing event '${eventName}':`, error?.message || error);
                                    // Maybe send error via ack?
                                    // if (ack) ack({ __tsError: 'Server error', details: error?.message });
              }
            });
          }
        }
      }

                socket.on('disconnect', (reason: string) => {
        console.log(`[ts-socketio-server] Socket disconnected: ${socket.id}, reason: ${reason}`);
      });
    });
        }
    };

    // --- Create Emitter Functions --- 
    const emitters: any = {};
    const serverEmitDefs = { ...(contract.definition.Server ?? {}), ...(contract.definition as SharedEvents<TDef>) };

    for (const eventName in serverEmitDefs) {
        if (Object.prototype.hasOwnProperty.call(serverEmitDefs, eventName)) {
            if (eventName in typedServerBase) { 
                console.warn(`[ts-socketio-server] Event name collision: Cannot create emitter for '${eventName}'.`);
                continue;
            }
            
            emitters[eventName] = async (payload: any, options?: BroadcastOptions) => {
                const baseMetadata: InternalMessageMetadata = {
                    messageId: uuidv4(),
                    serverTimestamp: Date.now(),
                };
                let customMetadata: Partial<ThisCustomMeta> = {};
                if (metadataProvider) {
                    try {
                        customMetadata = await metadataProvider(eventName, payload, options);
                    } catch (err: any) {
                        console.error(`[ts-socketio-server] Metadata provider failed for event '${eventName}':`, err?.message || err);
                    }
                }
                const finalMetadata: MessageMetadata<ThisCustomMeta> = { 
                    ...baseMetadata, 
                    ...customMetadata 
                } as MessageMetadata<ThisCustomMeta>; // Assert the final shape
                
                const envelope = { payload, metadata: finalMetadata }; 
                
                // Progressively build the target for emission
                // Start with the base Server instance
                let target: Server | ReturnType<typeof io.to> | ReturnType<typeof io.except> = io;
                
                if (options?.to) {
                    target = target.to(options.to);
                }
                if (options?.except) {
                    // .except() can be called on Server or BroadcastOperator
                    target = target.except(options.except);
                }
                // .emit() exists on Server and BroadcastOperator
                target.emit(eventName, envelope);
            };
        }
    }

    // --- Combine Base and Emitters --- 
    const typedServer = { ...typedServerBase, ...emitters };

    // Return the fully typed server instance
    return typedServer as TypedSocketServer<ThisContract>;
} 