import 'reflect-metadata'; // Ensure reflect-metadata is imported for decorators
// The WebSocketServer import is needed for NestJS metadata reflection, even if not directly called.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - TS6133: 'WebSocketServer' is declared but its value is never read.
import { WebSocketServer } from '@nestjs/websockets';
import { SocketContract, DirectionalContractDefinition } from '@ts-socketio/core';
import { TypedServerEmitter } from './types';
import { TypedServerEmitterImpl } from './emitter';
import { Server } from 'socket.io';

/**
 * Property decorator to inject a type-safe server emitter instance.
 * Requires the class to also have a property decorated with `@WebSocketServer()`.
 *
 * @param contract The processed contract object from `defineSocketContract`.
 */
export function TypedServer<TContract extends SocketContract & { definition: DirectionalContractDefinition }>(
    contract: TContract
): PropertyDecorator {
    return (target: object, propertyKey: string | symbol) => {
        // Use a getter to dynamically find the raw server instance and create the emitter
        // This ensures the raw server is available when the emitter is accessed.
        Object.defineProperty(target, propertyKey, {
            get: function() {
                // `this` refers to the instance of the gateway class
                const gatewayInstance = this as any;

                // Find the property decorated with @WebSocketServer()
                let ioServer: Server | undefined;
                for (const key in gatewayInstance) {
                    if (Object.prototype.hasOwnProperty.call(gatewayInstance, key)) {
                        // Check metadata attached by @WebSocketServer()
                        // Note: This relies on internal metadata keys used by NestJS, which might be fragile.
                        // A more robust approach might involve a custom decorator or service locator.
                        // Let's assume a common metadata key pattern for now (needs verification)
                        const metadataKeys = Reflect.getMetadataKeys(gatewayInstance, key);
                        if (metadataKeys.includes('__isWebSocketServer__') || key === 'server') { // Heuristic
                           if (gatewayInstance[key] instanceof Server) {
                                ioServer = gatewayInstance[key];
                                break;
                           } 
                        }
                    }
                }

                if (!ioServer) {
                    throw new Error(`Cannot find WebSocketServer instance on ${target.constructor.name}. Ensure a property is decorated with @WebSocketServer().`);
                }

                // Create and cache the emitter instance on the gateway instance
                const emitterKey = `__typedServerEmitter_${String(propertyKey)}__`;
                if (!gatewayInstance[emitterKey]) {
                    gatewayInstance[emitterKey] = new TypedServerEmitterImpl(ioServer, contract);
                }
                return gatewayInstance[emitterKey] as TypedServerEmitter<TContract>;
            },
            enumerable: true,
            configurable: true
        });
    };
}

// Note: @TypedServerHandler decorator is removed as per revised plan.
// Users will use @SubscribeMessage and the tsSocketioHandler helper function directly.
