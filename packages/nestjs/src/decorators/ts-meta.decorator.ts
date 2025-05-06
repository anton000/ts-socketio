import { createParamDecorator, ExecutionContext } from '@nestjs/common';
/**
 * Parameter decorator to inject ts-socketio message metadata into handler parameters.
 * Usage: handler(@TSMeta() metadata) { ... }
 */
export const TsMeta = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const args = ctx.getArgs();
    if (args.length >= 2 && args[1] && typeof args[1] === 'object' && 'metadata' in args[1]) {
      const metadata = args[1].metadata;
      if (data) {
        // Return the requested property if it exists
        return metadata?.[data];
      }
      return metadata;
    }
    return undefined;
  }
);