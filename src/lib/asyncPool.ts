/**
 * asyncPool - Bounded Concurrency Helper
 *
 * Runs an asynchronous iterator function over an array of items with a fixed concurrency limit.
 * Helps prevent main-thread freezing and memory spikes during bulk tasks.
 */

export interface AsyncPoolOptions {
  concurrency?: number;
  signal?: AbortSignal;
}

/**
 * Yields control to the main thread so UI updates (progress bar, animations) can render.
 */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Executes async tasks with a concurrency ceiling.
 *
 * @param concurrency Maximum concurrent executions (default: 3)
 * @param items Array of items to iterate over
 * @param iteratorFn Asynchronous function called for each item
 * @param signal Optional AbortSignal to halt further iterations
 */
export async function asyncPool<T, R>(
  concurrency: number,
  items: T[],
  iteratorFn: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal
): Promise<R[]> {
  const limit = Math.max(1, concurrency);
  const results: R[] = [];
  const executing: Set<Promise<void>> = new Set();

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      break;
    }

    const item = items[i];
    const index = i;

    const task = (async () => {
      if (signal?.aborted) return;
      const res = await iteratorFn(item, index);
      results.push(res);
    })();

    const cleanTask = task.finally(() => {
      executing.delete(cleanTask);
    });

    executing.add(cleanTask);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
