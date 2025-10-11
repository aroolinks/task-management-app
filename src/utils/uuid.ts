/**
 * Generates a simple UUID v4-like string
 * This is a fallback for environments that don't support crypto.randomUUID()
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generates a UUID using the browser's crypto.randomUUID() if available,
 * otherwise falls back to a simple implementation
 */
export function createUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return generateUUID();
}