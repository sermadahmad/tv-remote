import { useDeviceStore } from '../../src/store/deviceStore';
import type { TVSession } from '../../src/core/tv/types';

const session: TVSession = {
  sessionId: 'active',
  deviceId: 'tv',
  capabilities: { keys: {}, text: 'unverified', longPress: 'unverified' },
};

beforeEach(() =>
  useDeviceStore.getState().setConnection({ status: 'disconnected' }),
);

test('volume stays unknown until a TV event arrives for the active session', () => {
  const volume = {
    type: 'volume',
    sessionId: 'active',
    level: 9,
    max: 50,
    muted: true,
  } as const;
  useDeviceStore.getState().handleEvent(volume);
  expect(useDeviceStore.getState().volume).toBeNull();
  useDeviceStore.getState().setConnection({ status: 'connected', session });
  expect(useDeviceStore.getState().volume).toBeNull();
  useDeviceStore.getState().handleEvent({ ...volume, sessionId: 'old' });
  expect(useDeviceStore.getState().volume).toBeNull();
  useDeviceStore.getState().handleEvent(volume);
  expect(useDeviceStore.getState().volume).toEqual(volume);
  useDeviceStore.getState().setConnection({ status: 'connected', session });
  expect(useDeviceStore.getState().volume).toEqual(volume);
  useDeviceStore
    .getState()
    .setConnection({ status: 'reconnecting', deviceId: 'tv', attempt: 1 });
  expect(useDeviceStore.getState().volume).toBeNull();
});

test('switching sessions clears the previous TV volume', () => {
  useDeviceStore.getState().setConnection({ status: 'connected', session });
  useDeviceStore.getState().handleEvent({
    type: 'volume',
    sessionId: 'active',
    level: 1,
    max: 10,
    muted: false,
  });
  useDeviceStore.getState().setConnection({
    status: 'connected',
    session: { ...session, sessionId: 'next' },
  });
  expect(useDeviceStore.getState().volume).toBeNull();
});
