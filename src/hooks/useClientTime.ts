'use client'

import { useEffect, useState } from 'react';

export const useClientTime = () => {
  const [clientTime, setClientTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setClientTime(new Date());
    setIsClient(true);
  }, []);

  return { clientTime, isClient };
};
