// Simple event bus for collection updates
const listeners = new Set<() => void>();

export function emitCollectionUpdate() {
  listeners.forEach(listener => listener());
}

export function onCollectionUpdate(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}