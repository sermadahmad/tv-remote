import { TVError } from '../../src/core/tv/errors';
import { DiscoveryService } from '../../src/features/discovery/DiscoveryService';
import type { DiscoverySnapshot } from '../../src/features/discovery/DiscoveryService';
import { FakeTVAdapter, television } from '../mocks/FakeTVAdapter';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
function setup() {
  const adapter = new FakeTVAdapter();
  const snapshots: DiscoverySnapshot[] = [];
  const discovery = new DiscoveryService(adapter, (state) =>
    snapshots.push(state),
  );
  return { adapter, snapshots, discovery };
}
test('deduplicates, updates endpoints, and handles disappearance', async () => {
  const { discovery, snapshots } = setup();
  await discovery.start();
  discovery.handle({ type: 'deviceFound', target: television });
  discovery.handle({
    type: 'deviceFound',
    target: { ...television, host: '192.168.1.21' },
  });
  expect(Object.keys(snapshots.at(-1)?.devices ?? {})).toHaveLength(1);
  discovery.handle({ type: 'deviceLost', deviceId: television.id });
  expect(snapshots.at(-1)?.status).toBe('searching');
  await discovery.stop();
  discovery.handle({ type: 'deviceFound', target: television });
  expect(snapshots.at(-1)?.status).toBe('searching');
});
test('finishes empty discovery and stops resources', async () => {
  const { discovery, adapter, snapshots } = setup();
  await discovery.start();
  await jest.advanceTimersByTimeAsync(15000);
  expect(snapshots.at(-1)?.status).toBe('empty');
  expect(adapter.stopCount).toBe(1);
});
test('retains found devices after the scan finishes', async () => {
  const { discovery, snapshots } = setup();
  await discovery.start();
  discovery.handle({ type: 'deviceFound', target: television });
  await jest.advanceTimersByTimeAsync(15000);
  expect(snapshots.at(-1)?.status).toBe('found');
});
test('permission denial is distinct from an empty scan', async () => {
  const { discovery, adapter, snapshots } = setup();
  adapter.error = new TVError('permissionDenied');
  await discovery.start();
  expect(snapshots.at(-1)).toMatchObject({
    status: 'error',
    error: { code: 'permissionDenied' },
  });
});
test('refresh and leaving the screen cancel the old scan', async () => {
  const { discovery, adapter } = setup();
  await discovery.start();
  await discovery.start();
  expect(adapter.stopCount).toBe(1);
  await discovery.stop();
  expect(jest.getTimerCount()).toBe(0);
  expect(adapter.stopCount).toBe(2);
});
test('resumes the focused screen after backgrounding but never restarts an unfocused screen', async () => {
  const { discovery, adapter } = setup();
  await discovery.start();
  await discovery.suspend();
  await discovery.resume();
  expect(adapter.discoveryCount).toBe(2);
  await discovery.stop();
  await discovery.resume();
  expect(adapter.discoveryCount).toBe(2);
});
test('permission recovery clears the error without fabricating a device', async () => {
  const { discovery, snapshots } = setup();
  await discovery.start();
  discovery.handle({ type: 'error', error: new TVError('permissionDenied') });
  expect(snapshots.at(-1)?.error?.code).toBe('permissionDenied');
  discovery.handle({ type: 'discoveryReady' });
  expect(snapshots.at(-1)).toMatchObject({
    status: 'searching',
    error: null,
    devices: {},
  });
  await discovery.stop();
});
test('denied permission stays distinct from an empty scan at timeout', async () => {
  const { discovery, snapshots } = setup();
  await discovery.start();
  discovery.handle({ type: 'error', error: new TVError('permissionDenied') });
  await jest.advanceTimersByTimeAsync(15000);
  expect(snapshots.at(-1)).toMatchObject({
    status: 'error',
    error: { code: 'permissionDenied' },
  });
});
test('network loss stops browsing and a network return starts a fresh scan', async () => {
  const { discovery, adapter, snapshots } = setup();
  await discovery.start();
  discovery.handle({ type: 'networkChanged', available: false });
  await jest.advanceTimersByTimeAsync(0);
  expect(snapshots.at(-1)?.error?.code).toBe('networkUnavailable');
  discovery.handle({ type: 'networkChanged', available: true });
  await jest.advanceTimersByTimeAsync(0);
  expect(adapter.discoveryCount).toBe(2);
  await discovery.stop();
});
test('concurrent refresh requests leave one active browse', async () => {
  const { discovery, adapter } = setup();
  await Promise.all([discovery.start(), discovery.start()]);
  expect(adapter.discoveryCount).toBe(1);
  await discovery.stop();
});
