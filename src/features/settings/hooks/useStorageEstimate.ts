import { useCallback, useEffect, useState } from 'react';

import { getStorageEstimate, requestPersistentStorage } from '@/lib/db';
import { toast } from '@/store/toast';

export interface StorageInfo {
  usage: number;
  quota: number;
  percent: number;
  isPersistent: boolean;
}

export function useStorageEstimate() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    usage: 0,
    quota: 0,
    percent: 0,
    isPersistent: false,
  });

  const refreshStorage = useCallback(async () => {
    try {
      const info = await getStorageEstimate();
      setStorageInfo(info);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getStorageEstimate()
      .then((info) => {
        if (active) setStorageInfo(info);
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, []);

  const handleRequestPersist = async () => {
    const success = await requestPersistentStorage();
    if (success) {
      toast.success('Penyimpanan persisten diizinkan oleh browser');
    } else {
      toast.info('Browser mengelola penyimpanan secara otomatis');
    }
    await refreshStorage();
  };

  return {
    storageInfo,
    refreshStorage,
    handleRequestPersist,
  };
}
