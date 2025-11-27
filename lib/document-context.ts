/**
 * Simple event emitter for document updates
 * Allows IngestionForm to notify DocumentList when documents change
 */

type Listener = () => void;

class DocumentRefreshEmitter {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const documentRefreshEmitter = new DocumentRefreshEmitter();