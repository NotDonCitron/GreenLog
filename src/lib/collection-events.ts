/**
 * @deprecated Use useCollection() hook instead. This event bus is only
 * retained for potential cross-route notifications and will be removed
 * once useCollection is verified stable across all consumers.
 */
// Simple event bus for collection updates
const listeners = new Set<() => void>();

export function emitCollectionUpdate() {
  listeners.forEach(listener => listener());
}

export function onCollectionUpdate(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}