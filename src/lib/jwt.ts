/**
 * JWT signing secret helper. Kept in its own module with no other imports so
 * it is safe to use from the Edge runtime (middleware) without pulling in
 * Mongoose or other Node-only dependencies.
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Define it in your hosting environment.');
  }
  return new TextEncoder().encode(secret);
}
