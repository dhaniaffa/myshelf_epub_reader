import { describe, expect, it } from 'vitest';

import { asyncPool, yieldToMain } from './asyncPool';

describe('asyncPool', () => {
  it('processes all items with specified concurrency', async () => {
    const items = [10, 20, 30, 40, 50];
    let maxRunning = 0;
    let currentlyRunning = 0;

    const results = await asyncPool(2, items, async (item) => {
      currentlyRunning++;
      maxRunning = Math.max(maxRunning, currentlyRunning);
      await new Promise((r) => setTimeout(r, 20));
      currentlyRunning--;
      return item * 2;
    });

    expect(results).toHaveLength(5);
    expect(results.sort((a, b) => a - b)).toEqual([20, 40, 60, 80, 100]);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it('handles empty items array', async () => {
    const results = await asyncPool(3, [], async (item: number) => item);
    expect(results).toEqual([]);
  });

  it('respects AbortSignal', async () => {
    const controller = new AbortController();
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const processed: number[] = [];

    const promise = asyncPool(
      1,
      items,
      async (item) => {
        processed.push(item);
        if (item === 2) {
          controller.abort();
        }
        await new Promise((r) => setTimeout(r, 10));
        return item;
      },
      controller.signal
    );

    const results = await promise;
    expect(processed.length).toBeLessThan(items.length);
    expect(results.length).toBeLessThan(items.length);
  });

  it('yieldToMain resolves without error', async () => {
    await expect(yieldToMain()).resolves.toBeUndefined();
  });
});
