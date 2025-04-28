import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import {
    TypedSocketContract,
    ContractOptions,
    DirectionalContractDefinition,
    InferCustomMetadata,
    InferPayload,
    InternalMessageMetadata,
    MessageMetadata,
    validatePayload,
    validateResponse,
    SharedEvents
} from '@ts-socketio/core';
import {
    TypedSocketClient,
    ClientListeners,
    ClientListenerCallback,
    ClientListenerEvents,
    ClientMetadataProvider,
    ReservedClientPropertyNames // Keep track of reserved names
} from './types';

// Create a runtime set of reserved names for checking
const reservedClientPropertyNamesSet = new Set<ReservedClientPropertyNames>([
    'socket', 'contract', 'options', 'listeners', 'setMetadataProvider',
    'emit', 'on', 'once', 'off', 'connect', 'disconnect'
]);

/**
 * Creates a type-safe Socket.IO client based on a shared contract.
 *
 * @template TDef - The contract's event definition structure.
 * @template TCustomMeta - The custom metadata type.
 * @param {TypedSocketContract<TDef, ContractOptions<TCustomMeta>>} contract - The defined contract.
 * @param {string} uri - The server URI to connect to.
 * @param {Partial<ManagerOptions & SocketOptions>} [opts] - Optional Socket.IO connection options.
 * @returns {TypedSocketClient<TypedSocketContract<TDef, ContractOptions<TCustomMeta>>>} A type-safe client instance.
 */
export function createTypedSocketClient<
    TDef extends DirectionalContractDefinition,
    TCustomMeta extends object = {}
>(
    contract: TypedSocketContract<TDef, ContractOptions<TCustomMeta>>,
    uri: string,
    opts?: Partial<ManagerOptions & SocketOptions>
): TypedSocketClient<TypedSocketContract<TDef, ContractOptions<TCustomMeta>>> {

    type ThisContract = TypedSocketContract<TDef, ContractOptions<TCustomMeta>>;
    type ThisCustomMeta = InferCustomMetadata<ThisContract['options']>;
    type ListenerEvents = ClientListenerEvents<TDef>;

    const socket: Socket = io(uri, { ...opts, autoConnect: opts?.autoConnect ?? true });
    let metadataProvider: ClientMetadataProvider<ThisCustomMeta> | null = null;

    // --- Build Listeners (`client.listeners.on<EventName>`) ---
    const listeners: ClientListeners<ListenerEvents, ThisCustomMeta> = {} as any;
    const serverEmitDefs = { ...(contract.definition.Server ?? {}), ...(contract.definition as SharedEvents<TDef>) };

    for (const eventName in serverEmitDefs) {
        if (Object.prototype.hasOwnProperty.call(serverEmitDefs, eventName)) {
            const eventDef = serverEmitDefs[eventName as keyof typeof serverEmitDefs]!;
            const listenerPropName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}` as keyof ClientListeners<ListenerEvents, ThisCustomMeta>;

            // Runtime check for listener name collision (though type system should help)
            if (listenerPropName in listeners) {
                console.warn(`[ts-socketio-client] Listener name collision: '${String(listenerPropName)}' cannot be created.`);
                continue;
            }

            (listeners as any)[listenerPropName] = (userCallback: ClientListenerCallback<InferPayload<typeof eventDef>, ThisCustomMeta>) => {
                const handler = (envelope: unknown) => {
                    // --- Envelope Unwrapping --- 
                    if (typeof envelope !== 'object' || envelope === null || !('payload' in envelope) || !('metadata' in envelope)) {
                        console.error(`[ts-socketio-client] Received malformed envelope for event '${eventName}'. Expected { payload, metadata }. Got:`, envelope);
                        return;
                    }
                    const rawPayload = (envelope as any).payload;
                    const rawMetadata = (envelope as any).metadata as InternalMessageMetadata & Partial<ThisCustomMeta>; // Trust server sent base shape

                    const clientReceiveTimestamp = Date.now();
                    const finalMetadata: MessageMetadata<ThisCustomMeta> = {
                        ...rawMetadata,
                        clientReceiveTimestamp,
                    };
                    
                    try {
                        // --- Payload Validation --- 
                        const validatedPayload = validatePayload(eventDef, rawPayload);

                        // --- Custom Metadata Validation --- 
                        const customMetaSchema = contract.options?.metadataSchema;
                        let validatedMetadata = finalMetadata; // Assume valid if no schema
                        if (customMetaSchema) {
                            const parseResult = customMetaSchema.safeParse(finalMetadata);
                            if (!parseResult.success) {
                                throw new Error(`Custom metadata validation failed: ${parseResult.error.message}`);
                            }
                            // Ensure only validated custom fields are passed
                            validatedMetadata = { ...finalMetadata, ...parseResult.data }; 
                        }

                        // --- Call User Callback --- 
                        userCallback(validatedPayload, validatedMetadata);

                    } catch (error: any) {
                        console.error(`[ts-socketio-client] Error processing incoming event '${eventName}':`, error?.message || error);
                    }
                };
                socket.on(eventName, handler);
                // Return unsubscribe function
                return () => {
                    socket.off(eventName, handler);
                };
            };
        }
    }

    // --- Base Client Object --- 
    const typedClientBase = {
        socket: socket,
        contract: contract,
        options: opts,
        listeners: listeners,
        setMetadataProvider(provider: ClientMetadataProvider<ThisCustomMeta>) {
            metadataProvider = provider;
        },
        connect: () => { socket.connect(); return typedClient as TypedSocketClient<ThisContract>; },
        disconnect: () => { socket.disconnect(); return typedClient as TypedSocketClient<ThisContract>; },
    };

    // --- Build Emitters (`client.<eventName>`) ---
    const emitters: any = {};
    const clientEmitDefs = { ...(contract.definition.Client ?? {}), ...(contract.definition as SharedEvents<TDef>) };

    for (const eventName in clientEmitDefs) {
        if (Object.prototype.hasOwnProperty.call(clientEmitDefs, eventName)) {
            const eventDef = clientEmitDefs[eventName as keyof typeof clientEmitDefs]!;

            // Collision check against reserved names (using the Set) and base properties
            if (eventName in typedClientBase || reservedClientPropertyNamesSet.has(eventName as any)) { // Use Set.has()
                throw new Error(`[ts-socketio-client] Event name collision: Cannot create emitter for event '${eventName}'.`);
            }

            const createEmitter = (isAck: boolean) => async (payload: InferPayload<typeof eventDef>) => {
                const baseMetadata: InternalMessageMetadata = {
                    messageId: uuidv4(),
                    clientTimestamp: Date.now(),
                };
                let customMetadata: Partial<ThisCustomMeta> = {};
                if (metadataProvider) {
                    try {
                        customMetadata = await metadataProvider(eventName, payload);
                    } catch (err: any) {
                        console.error(`[ts-socketio-client] Metadata provider failed for event '${eventName}':`, err?.message || err);
                    }
                }
                const finalMetadata: MessageMetadata<ThisCustomMeta> = { 
                    ...baseMetadata, 
                    ...customMetadata 
                } as MessageMetadata<ThisCustomMeta>; // Assert final shape
                
                const envelope = { payload, metadata: finalMetadata }; 

                if (isAck) {
                    // Event expects an acknowledgement
                    return new Promise((resolve, reject) => {
                        socket.emit(eventName, envelope, (rawResponse: unknown) => {
                            // ACK response is NOT enveloped
                            try {
                                const validatedResponse = validateResponse(eventDef, rawResponse);
                                resolve(validatedResponse);
                            } catch (error: any) {
                                console.error(`[ts-socketio-client] Error validating server ACK response for '${eventName}':`, error?.message || error);
                                reject(error);
                            }
                        });
                        // TODO: Add timeout for ACK?
                    });
                } else {
                    // Fire-and-forget
                    socket.emit(eventName, envelope);
                    return; // Explicit void return
                }
            };

            emitters[eventName] = createEmitter(!!eventDef.response);
        }
    }

    // Combine base, listeners, and emitters
    const typedClient = { ...typedClientBase, ...emitters };

    // Final type assertion
    return typedClient as TypedSocketClient<ThisContract>;
} 