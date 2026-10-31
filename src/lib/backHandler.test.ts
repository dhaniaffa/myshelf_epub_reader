import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBackStackDepth, handleBackAction, registerBackHandler } from './backHandler';

describe('Global Back Handler Stack (src/lib/backHandler.ts)', () => {
  beforeEach(() => {
    // Drain stack before each test
    while (handleBackAction()) {
      // drain
    }
  });

  it('initially has a stack depth of 0', () => {
    expect(getBackStackDepth()).toBe(0);
    expect(handleBackAction()).toBe(false);
  });

  it('registers handlers in LIFO order (last in, first out)', () => {
    const callOrder: string[] = [];

    registerBackHandler(() => {
      callOrder.push('first');
      return true;
    });

    registerBackHandler(() => {
      callOrder.push('second');
      return true;
    });

    expect(getBackStackDepth()).toBe(2);

    const handled = handleBackAction();
    expect(handled).toBe(true);
    expect(callOrder).toEqual(['second']);
    expect(getBackStackDepth()).toBe(1);

    handleBackAction();
    expect(callOrder).toEqual(['second', 'first']);
    expect(getBackStackDepth()).toBe(0);
  });

  it('unregisters handlers cleanly via cleanup callback', () => {
    const handler1 = vi.fn(() => true);
    const handler2 = vi.fn(() => true);

    const unregister1 = registerBackHandler(handler1);
    const unregister2 = registerBackHandler(handler2);

    expect(getBackStackDepth()).toBe(2);

    // Unregister top handler
    unregister2();
    expect(getBackStackDepth()).toBe(1);

    handleBackAction();
    expect(handler2).not.toHaveBeenCalled();
    expect(handler1).toHaveBeenCalledTimes(1);

    unregister1();
    expect(getBackStackDepth()).toBe(0);
  });

  it('continues down the stack if a handler returns false', () => {
    const callOrder: string[] = [];

    registerBackHandler(() => {
      callOrder.push('bottom');
      return true;
    });

    registerBackHandler(() => {
      callOrder.push('top');
      return false; // not consumed
    });

    const handled = handleBackAction();
    expect(handled).toBe(true);
    expect(callOrder).toEqual(['top', 'bottom']);
    expect(getBackStackDepth()).toBe(0);
  });

  it('returns false when no handler consumes the action or stack is empty', () => {
    registerBackHandler(() => false);
    expect(handleBackAction()).toBe(false);
  });
});
