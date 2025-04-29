import {
    SocketContract,
    EventDefinition,
    InferPayload
} from '@ts-socketio/core';
import { ServerEmitters, ServerEmitterEvents, EventHandlerContext } from '@ts-socketio/server';

/**
 * Represents the type-safe emitter object injected by the `@TypedServer` decorator.
 * It provides methods for emitting server-to-client events defined in the contract.
 */
export type TypedServerEmitter<TContract extends SocketContract> = 
    ServerEmitters<ServerEmitterEvents<TContract['definition']>>;

export type EventHandlerParams<TEventDef extends EventDefinition<any, any>, TCustomMeta extends object = {}> = 
EventHandlerContext<InferPayload<TEventDef>, TCustomMeta>;