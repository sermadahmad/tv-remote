import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { RemoteCommand } from '../../core/tv/types';
import { connection, report } from '../runtime';

export function useFocusedCommands(sessionId: string | null) {
  const epoch = useRef(0);
  const active = useRef<{ sessionId: string | null; token: number } | null>(
    null,
  );
  const [token, setToken] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      const next = ++epoch.current;
      active.current = { sessionId, token: next };
      setToken(next);
      return () => {
        active.current = null;
        setToken(null);
        if (sessionId) void connection.releaseKeys(sessionId).catch(report);
      };
    }, [sessionId]),
  );
  return useCallback(
    (command: RemoteCommand): void => {
      if (
        !sessionId ||
        token === null ||
        active.current?.token !== token ||
        active.current.sessionId !== sessionId
      )
        return;
      void connection.send(command, sessionId).catch(report);
    },
    [sessionId, token],
  );
}
