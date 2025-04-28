import { DirectionalContractDefinition, TypedSocketContract, ContractOptions } from './types';

/**
 * Defines a type-safe contract for Socket.IO communication.
 *
 * @template TDef - The shape of the event definitions (Client, Server, Shared).
 * @template TCustomMeta - The shape of the custom metadata object (defaults to {}).
 *
 * @param {TDef} definition - An object containing Client, Server, and/or shared event definitions.
 * @param {ContractOptions<TCustomMeta>} [options] - Optional configuration, including a Zod schema for custom metadata.
 * @returns {TypedSocketContract<TDef, ContractOptions<TCustomMeta>>} - An object representing the typed contract.
 */
export function defineSocketContract<
  TDef extends DirectionalContractDefinition,
  TCustomMeta extends object = {}
>(
  definition: TDef,
  options?: ContractOptions<TCustomMeta>
): TypedSocketContract<TDef, ContractOptions<TCustomMeta>> {
  // Currently, this function primarily serves to structure the input 
  // and provide a type assertion based on the generic parameters.
  // Future enhancements could add validation of the definition structure itself.
  return {
    definition,
    options,
  } as const; // Use 'as const' for stricter type inference on the returned object
} 