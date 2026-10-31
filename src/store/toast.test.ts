import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toast, useToastStore } from './toast';

describe('Toast Store (src/store/toast.ts)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear all existing toasts
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast message to the store with unique id', () => {
    toast.info('Selamat datang di MyShelf');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Selamat datang di MyShelf');
    expect(toasts[0].type).toBe('info');
    expect(toasts[0].id).toBeDefined();
  });

  it('supports success, warning, and error toast variants', () => {
    toast.success('Buku berhasil diunduh');
    toast.warning('Koneksi internet lambat');
    toast.error('Gagal membuka berkas');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(3);
    expect(toasts[0].type).toBe('success');
    expect(toasts[1].type).toBe('warning');
    expect(toasts[2].type).toBe('error');
  });

  it('manually removes a toast by id via removeToast', () => {
    toast.info('Pesan pertama');
    toast.info('Pesan kedua');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);

    const firstId = toasts[0].id;
    useToastStore.getState().removeToast(firstId);

    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('Pesan kedua');
  });

  it('automatically removes toast after specified duration', () => {
    toast.info('Pesan berdurasi 3 detik', 3000);

    expect(useToastStore.getState().toasts).toHaveLength(1);

    // Fast-forward 2999ms - should still exist
    vi.advanceTimersByTime(2999);
    expect(useToastStore.getState().toasts).toHaveLength(1);

    // Fast-forward past 3000ms - should be removed
    vi.advanceTimersByTime(2);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
