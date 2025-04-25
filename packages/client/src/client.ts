import { io, ManagerOptions, SocketOptions } from 'socket.io-client';
import {
    DirectionalContractDefinition,
    SocketContract,
    InferPayload,
    InferResponse,
    MessageMetadata,
    validatePayload,
    validateResponse
} from '@ts-socketio/core';
import {
    TypedSocketClient,
    ClientListeners,
    ClientListenerCallback,
    ContractServerEvents
} from './types';

/**
 * Creates a type-safe Socket.IO client based on a shared contract.
 *
 * @param contract The processed contract object from `@ts-socketio/core`'s `defineSocketContract`.
 * @param uri The server URI to connect to.
 * @param opts Optional Socket.IO connection options.
 * @returns A TypedSocketClient instance.
 */
export function createTypedSocketClient<
  TContractDef extends DirectionalContractDefinition,
  TProcessedContract extends SocketContract & { definition: TContractDef }
>(
  contract: TProcessedContract,
  uri: string,
  opts?: Partial<ManagerOptions & SocketOptions>
): TypedSocketClient<TProcessedContract> {

  const socket = io(uri, { ...opts, autoConnect: opts?.autoConnect ?? true });

  // --- Build Listeners (`client.listeners.on<EventName>`) ---
  const listeners: ClientListeners<ContractServerEvents<TProcessedContract>> = {} as any;

  for (const eventName in contract.serverEvents) {
      if (Object.prototype.hasOwnProperty.call(contract.serverEvents, eventName)) {
          const eventDef = contract.serverEvents[eventName]!;
          const listenerPropName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}` as keyof ClientListeners<ContractServerEvents<TProcessedContract>>;

          if (listenerPropName in listeners) {
              throw new Error(`[ts-socketio-client] Listener name collision: Generated listener name '${String(listenerPropName)}' for event '${eventName}' already exists.`);
          }

          (listeners as any)[listenerPropName] = (userCallback: ClientListenerCallback<typeof eventDef>) => {
              const handler = (rawPayload: unknown) => {
                  try {
                      const metadata: MessageMetadata = {};
                      const validatedPayload = validatePayload(eventDef, rawPayload);
                      userCallback(validatedPayload, metadata);
                  } catch (error) {
                      console.error(`[ts-socketio-client] Error validating/handling incoming event '${eventName}':`, error);
                  }
              };
              socket.on(eventName, handler);
              return () => {
                  socket.off(eventName, handler);
              };
          };
      }
  }

  // --- Build Client Object --- 
  const typedClient = {
    socket: socket,
    contract: contract,
    options: opts,
    listeners: listeners,
    connect: () => { socket.connect(); return typedClient as TypedSocketClient<TProcessedContract>; },
    disconnect: () => { socket.disconnect(); return typedClient as TypedSocketClient<TProcessedContract>; },
  } as Partial<TypedSocketClient<TProcessedContract>>;

  // --- Build Emitters (`client.<eventName>`) ---
  for (const eventName in contract.clientEvents) {
    if (Object.prototype.hasOwnProperty.call(contract.clientEvents, eventName)) {
      const eventDef = contract.clientEvents[eventName]!;

      if (eventName in typedClient) {
        throw new Error(`[ts-socketio-client] Event name collision: Cannot create emitter for event '${eventName}' as property already exists on the client.`);
      }

      if (eventDef.response) {
        (typedClient as any)[eventName] = (payload: InferPayload<typeof eventDef>): Promise<InferResponse<typeof eventDef>> => {
          return new Promise((resolve, reject) => {
            socket.emit(eventName, payload, (rawResponse: unknown) => {
              try {
                const validatedResponse = validateResponse(eventDef, rawResponse);
                resolve(validatedResponse);
              } catch (error) {
                console.error(`[ts-socketio-client] Error validating server response for event '${eventName}':`, error);
                reject(error);
              }
            });
          });
        };
      } else {
        (typedClient as any)[eventName] = (payload: InferPayload<typeof eventDef>): void => {
          socket.emit(eventName, payload);
        };
      }
    }
  }

  // Final type assertion after building all methods
  return typedClient as TypedSocketClient<TProcessedContract>;
} 