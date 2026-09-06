/**
 * Recursively removes all `undefined` values from an object or array.
 * Firestore strictly forbids `undefined` field values in document writes (setDoc, updateDoc, addDoc).
 * This utility deep-cleans objects, arrays, and nested properties, removing undefined keys so writes never fail.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Arrays: remove undefined items and sanitize inner elements
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  // Handle Objects
  if (typeof data === 'object') {
    // Preserve Date instances and special types
    if (data instanceof Date) return data;

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as T;
  }

  // Primitives (string, number, boolean, etc.)
  return data;
}
