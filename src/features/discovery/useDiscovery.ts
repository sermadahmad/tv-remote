import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useDeviceStore } from '../../store/deviceStore';
import { discovery, report } from '../runtime';

export function useDiscovery() {
  useFocusEffect(
    useCallback(() => {
      void discovery.start().catch(report);
      return () => {
        void discovery.stop().catch(report);
      };
    }, []),
  );
  const devices = useDeviceStore((state) => state.discovered);
  const status = useDeviceStore((state) => state.discovery);
  const error = useDeviceStore((state) => state.discoveryError);
  return {
    devices: Object.values(devices),
    status,
    error,
    refresh: () => {
      void discovery.start().catch(report);
    },
  };
}
