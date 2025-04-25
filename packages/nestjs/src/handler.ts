import { Server, Socket } from 'socket.io';
import { z, ZodError, ZodSchema } from 'zod';
import { WsException } from '@nestjs/websockets';
// @ts-ignore
import {
  InferPayload,
  InferResponse,
  validatePayload,
  validateResponse,
} from '@ts-socketio/core';
import { SocketEventHandlerContext } from './types';

/**
 * Wraps a NestJS WebSocket handler to provide ts-socketio type safety and validation.
 *
 * @param schemas An object containing optional `payload` and `response` Zod schemas.
 * @param rawData The raw data received in the NestJS handler.
 * @param socket The client socket instance.
 * @param io The Socket.IO server instance.
 * @param userCallback Your handler logic function.
 * @returns A Promise resolving to the validated response data or undefined.
 * @throws WsException on validation failure.
 */
export async function tsSocketioHandler<
  PayloadSchema extends ZodSchema | undefined,
  ResponseSchema extends ZodSchema | undefined
>(
  schemas: { payload?: PayloadSchema; response?: ResponseSchema },
  rawData: unknown,
  socket: Socket,
  io: Server,
  userCallback: (
    context: SocketEventHandlerContext<
      PayloadSchema extends ZodSchema ? z.infer<PayloadSchema> : void
    >
  ) => 
    | Promise<ResponseSchema extends ZodSchema ? z.infer<ResponseSchema> : void>
    | (ResponseSchema extends ZodSchema ? z.infer<ResponseSchema> : void)
): Promise<(ResponseSchema extends ZodSchema ? z.infer<ResponseSchema> : void) | undefined> {

  type ExpectedPayload = PayloadSchema extends ZodSchema ? z.infer<PayloadSchema> : void;
  type ExpectedResponse = ResponseSchema extends ZodSchema ? z.infer<ResponseSchema> : void;

  let validatedPayload: ExpectedPayload;
  try {
    // Use validatePayload internally, passing the schema directly
    if (schemas.payload) {
      validatedPayload = schemas.payload.parse(rawData) as ExpectedPayload;
    } else {
        // If no schema, ensure rawData is undefined/null if ExpectedPayload is void
        if (rawData !== undefined && rawData !== null) {
            // This might indicate a contract mismatch if payload is void but data received
             console.warn('[ts-socketio/nestjs] Received payload data but no payload schema defined in contract.');
             // Depending on strictness, could throw or just proceed with data as 'any' -> void
        }
        validatedPayload = undefined as ExpectedPayload;
    }
  } catch (error) {
    if (error instanceof ZodError) {
        console.error(`[ts-socketio/nestjs] Payload validation failed:`, error.errors);
        throw new WsException({ event: 'error', data: { message: 'Invalid payload', details: error.flatten() }});
    }
    console.error(`[ts-socketio/nestjs] Unknown error during payload validation:`, error);
    throw new WsException('Payload validation failed');
  }

  const context: SocketEventHandlerContext<ExpectedPayload> = {
    payload: validatedPayload,
    metadata: {},
    socket,
    io,
  };

  try {
    const result = await userCallback(context);

    if (schemas.response) {
      try {
        const validatedResponse = schemas.response.parse(result) as ExpectedResponse;
        return validatedResponse; // Return validated response for NestJS ack
      } catch (error) {
        if (error instanceof ZodError) {
            console.error(`[ts-socketio/nestjs] Response validation failed for event handler:`, error.errors);
            throw new WsException({ event: 'error', data: { message: 'Invalid response from handler', details: error.flatten() }});
        }
        console.error(`[ts-socketio/nestjs] Unknown error during response validation:`, error);
        throw new WsException('Handler response validation failed');
      }
    } else {
        // Check if handler returned something unexpectedly
        if (result !== undefined && result !== null) {
            console.warn('[ts-socketio/nestjs] Handler returned a value but no response schema defined in contract. Value ignored.');
        }
    }
    // No response expected by contract, return undefined
    return undefined;
  } catch (error) {
      // Catch errors from the userCallback itself
      console.error(`[ts-socketio/nestjs] Error executing event handler:`, error);
      // Rethrow as WsException unless it already is one
      if (error instanceof WsException) {
          throw error;
      }
      throw new WsException('Internal server error during handler execution');
  }
}
