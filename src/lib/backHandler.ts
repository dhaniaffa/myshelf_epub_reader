/**
 * Global LIFO Back Handler Stack
 * Allows modals, sheets, drawers, and custom sub-views to register back-press handlers.
 */

export type BackHandlerCallback = () => boolean | void;

const handlerStack: BackHandlerCallback[] = [];

/**
 * Register a back button handler callback.
 * Handlers are invoked in LIFO order (Last In, First Out).
 * If the handler returns `true` (or undefined), the back event is considered consumed.
 * If it returns `false`, execution continues to the next handler down the stack.
 *
 * @returns A cleanup function to unregister the handler.
 */
export function registerBackHandler(handler: BackHandlerCallback): () => void {
  handlerStack.push(handler);
  return () => {
    const idx = handlerStack.lastIndexOf(handler);
    if (idx !== -1) {
      handlerStack.splice(idx, 1);
    }
  };
}

/**
 * Attempt to handle a back action using the registered stack.
 * @returns true if a handler consumed the event, false if the stack was empty.
 */
export function handleBackAction(): boolean {
  while (handlerStack.length > 0) {
    const handler = handlerStack.pop();
    if (handler) {
      const handled = handler();
      if (handled !== false) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get current depth of the back handler stack.
 */
export function getBackStackDepth(): number {
  return handlerStack.length;
}
