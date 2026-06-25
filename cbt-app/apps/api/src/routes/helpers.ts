import type { FastifyReply } from 'fastify';
import type { z, ZodTypeAny } from 'zod';

/**
 * Parse a body against a Zod schema; send 400 with issues on failure.
 * Returns the schema's OUTPUT type (after transforms), or undefined on error.
 */
export function parseBody<S extends ZodTypeAny>(
  schema: S,
  body: unknown,
  reply: FastifyReply,
): z.infer<S> | undefined {
  const result = schema.safeParse(body);
  if (!result.success) {
    void reply.code(400).send({ error: 'validation_error', issues: result.error.issues });
    return undefined;
  }
  return result.data;
}
