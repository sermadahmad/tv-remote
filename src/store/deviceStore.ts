import { create } from 'zustand';

import type {
  ConnectionState,
  DiscoveryState,
  SavedDevice,
  TVFailure,
  TVEvent,
  TVTarget,
} from '../core/tv/types';

interface DeviceStore {
  discovered: Record<string, TVTarget>;
  discovery: DiscoveryState;
  discoveryError: TVFailure | null;
  connection: ConnectionState;
  selected: TVTarget | null;
  saved: SavedDevice[];
  notice: TVFailure | null;
  volume: Extract<TVEvent, { type: 'volume' }> | null;
  setConnection: (connection: ConnectionState) => void;
  handleEvent: (event: TVEvent) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  discovered: {},
  discovery: 'idle',
  discoveryError: null,
  connection: { status: 'disconnected' },
  selected: null,
  saved: [],
  notice: null,
  volume: null,
  setConnection: (connection) =>
    set((previous) => ({
      connection,
      volume:
        connection.status === 'connected' &&
        previous.volume?.sessionId === connection.session.sessionId
          ? previous.volume
          : null,
    })),
  handleEvent: (event) =>
    set((state) => {
      if (
        event.type !== 'volume' ||
        state.connection.status !== 'connected' ||
        event.sessionId !== state.connection.session.sessionId
      )
        return state;
      return { volume: event };
    }),
}));
