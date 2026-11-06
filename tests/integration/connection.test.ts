import { ConnectionCoordinator } from '../../src/core/tv/ConnectionCoordinator';
import { TVRepository } from '../../src/core/tv/TVRepository';
import { TVError } from '../../src/core/tv/errors';
import type {
  ConnectionState,
  PairingChallenge,
  TVSession,
} from '../../src/core/tv/types';
import {
  FakeTVAdapter,
  MemoryDevices,
  MemoryReferences,
  television,
  testSession,
} from '../mocks/FakeTVAdapter';

function setup(paired = true) {
  const adapter = new FakeTVAdapter();
  const devices = new MemoryDevices();
  const references = new MemoryReferences();
  if (paired) references.values.set(television.id, 'opaque');
  const repository = new TVRepository(adapter, devices, references);
  const states: ConnectionState[] = [];
  const notices = jest.fn();
  const coordinator = new ConnectionCoordinator(
    adapter,
    repository,
    (state) => states.push(state),
    notices,
    () => 0.5,
  );
  return {
    adapter,
    devices,
    references,
    repository,
    coordinator,
    states,
    notices,
  };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('releases held keys without disconnecting an active session', async () => {
  const { coordinator, adapter } = setup();
  await coordinator.select(television);
  await coordinator.send(
    { type: 'key', key: 'up', action: 'press' },
    testSession.sessionId,
  );
  await coordinator.releaseKeys(testSession.sessionId);
  expect(adapter.released).toEqual([testSession.sessionId]);
  expect(adapter.disconnected).toEqual([]);
  expect(coordinator.snapshot().status).toBe('connected');
});
test('ignores commands and releases scoped to an obsolete session', async () => {
  const { coordinator, adapter, references } = setup();
  await coordinator.select(television);
  references.values.set('other', 'opaque');
  adapter.connectImpl = async () => ({
    ...testSession,
    sessionId: 'new-session',
    deviceId: 'other',
  });
  await coordinator.select({
    ...television,
    id: 'other',
    identity: 'authenticated',
  });
  adapter.sent.length = 0;
  adapter.released.length = 0;
  await coordinator.send(
    { type: 'key', key: 'up', action: 'release' },
    testSession.sessionId,
  );
  await coordinator.releaseKeys(testSession.sessionId);
  expect(adapter.sent).toEqual([]);
  expect(adapter.released).toEqual([]);
  await coordinator.send(
    { type: 'key', key: 'up', action: 'tap' },
    'new-session',
  );
  expect(adapter.sent).toHaveLength(1);
});
test('stale screen input after disconnect is ignored while ordinary sends still report connection loss', async () => {
  const { coordinator } = setup();
  await coordinator.send(
    { type: 'key', key: 'up', action: 'tap' },
    'old-session',
  );
  await coordinator.releaseKeys('old-session');
  await expect(
    coordinator.send({ type: 'key', key: 'up', action: 'tap' }),
  ).rejects.toMatchObject({ code: 'connectionLost' });
});
test('forgetting an old TV cannot erase a newly selected TV or its recovery target', async () => {
  const { coordinator, adapter, references } = setup();
  await coordinator.select(television);
  let finish = (): void => {};
  jest.spyOn(adapter, 'releaseKeys').mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const forgetting = coordinator.forget(television.id);
  const other = {
    ...television,
    id: 'other',
    name: 'Other',
    serviceName: 'Other',
    host: '192.168.1.21',
  };
  references.values.set(other.id, 'opaque-other');
  await coordinator.select(other);
  finish();
  await forgetting;
  coordinator.handle({
    type: 'disconnected',
    sessionId: testSession.sessionId,
    error: new TVError('connectionLost'),
  });
  expect(coordinator.snapshot()).toMatchObject({
    status: 'reconnecting',
    deviceId: other.id,
  });
  await jest.advanceTimersByTimeAsync(1000);
  expect(coordinator.snapshot()).toMatchObject({
    status: 'connected',
    session: { deviceId: other.id },
  });
});
test('selecting a TV waits for its pending forget and starts fresh pairing', async () => {
  const { coordinator, adapter } = setup();
  await coordinator.select(television);
  let finish = (): void => {};
  let markEntered = (): void => {};
  const entered = new Promise<void>((resolve) => {
    markEntered = resolve;
  });
  jest.spyOn(adapter, 'forgetCredentials').mockImplementationOnce(() => {
    markEntered();
    return new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  const forgetting = coordinator.forget(television.id);
  await entered;
  const selecting = coordinator.select(television);
  await Promise.resolve();
  expect(adapter.pairingCount).toBe(0);
  finish();
  await Promise.all([forgetting, selecting]);
  expect(coordinator.snapshot()).toMatchObject({ status: 'pairing' });
  expect(adapter.pairingCount).toBe(1);
});
test('duplicate forgetting shares one credential deletion', async () => {
  const { coordinator, adapter } = setup();
  await coordinator.select(television);
  let finish = (): void => {};
  jest.spyOn(adapter, 'releaseKeys').mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const first = coordinator.forget(television.id);
  const second = coordinator.forget(television.id);
  finish();
  await Promise.all([first, second]);
  expect(adapter.forgotten).toEqual([television.id]);
});
test('failed forgetting can be retried after storage recovers', async () => {
  const { coordinator, adapter, repository } = setup();
  await coordinator.select(television);
  adapter.forgetError = new TVError('storageFailure');
  await expect(coordinator.forget(television.id)).rejects.toMatchObject({
    code: 'storageFailure',
  });
  expect(repository.list()).toHaveLength(1);
  adapter.forgetError = null;
  await coordinator.forget(television.id);
  expect(repository.list()).toHaveLength(0);
});
test('switching TVs disables the old controls before cleanup completes', async () => {
  const { coordinator, adapter } = setup();
  await coordinator.select(television);
  let finish = (): void => {};
  jest.spyOn(adapter, 'releaseKeys').mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const switching = coordinator.select({
    ...television,
    id: 'other',
    serviceName: 'Other TV',
    host: '192.168.1.21',
  });
  expect(coordinator.snapshot()).toMatchObject({
    status: 'connecting',
    deviceId: 'other',
  });
  await expect(
    coordinator.send({ type: 'key', key: 'up', action: 'tap' }),
  ).rejects.toThrow();
  finish();
  await switching;
  expect(adapter.disconnected).toContain(testSession.sessionId);
});
test('rejects a native session for a different device', async () => {
  const { coordinator, adapter } = setup();
  adapter.connectImpl = async () => ({
    ...testSession,
    deviceId: 'wrong-device',
  });
  await coordinator.select(television);
  expect(coordinator.snapshot()).toMatchObject({
    status: 'error',
    error: { code: 'protocolFailure' },
  });
  expect(adapter.disconnected).toContain(testSession.sessionId);
});
test('storage corruption closes the previous session and fails safely', async () => {
  const { coordinator, devices, adapter } = setup();
  await coordinator.select(television);
  jest.spyOn(devices, 'readDevices').mockImplementation(() => {
    throw new TVError('storageFailure');
  });
  await coordinator.select({ ...television, id: 'other' });
  expect(coordinator.snapshot()).toMatchObject({
    status: 'error',
    error: { code: 'storageFailure' },
  });
  expect(adapter.disconnected).toContain(testSession.sessionId);
});
test('pairing adopts the authenticated target identity', async () => {
  const { coordinator, adapter, repository } = setup(false);
  adapter.submitImpl = async () => ({
    ...television,
    id: 'authenticated-tv',
    identity: 'authenticated',
  });
  await coordinator.select(television);
  await coordinator.submit('ABCDEF');
  expect(repository.selected()?.target.id).toBe('authenticated-tv');
});
test('pairs and connects without duplicate pairing attempts', async () => {
  const { adapter, coordinator } = setup(false);
  await coordinator.select(television);
  expect(coordinator.snapshot().status).toBe('pairing');
  await coordinator.select(television);
  expect(adapter.pairingCount).toBe(1);
  await coordinator.submit('ab12ef');
  expect(coordinator.snapshot().status).toBe('connected');
  await coordinator.select(television);
  expect(adapter.connectionCount).toBe(1);
});
test('connects, dispatches supported commands, and releases on disconnect', async () => {
  const { adapter, coordinator } = setup();
  await coordinator.select(television);
  await coordinator.send({ type: 'key', key: 'up', action: 'tap' });
  expect(adapter.sent).toHaveLength(1);
  await expect(
    coordinator.send({ type: 'key', key: 'power', action: 'tap' }),
  ).rejects.toThrow();
  await coordinator.disconnect();
  expect(adapter.released).toEqual([testSession.sessionId]);
  expect(adapter.disconnected).toEqual([testSession.sessionId]);
  await expect(
    coordinator.send({ type: 'key', key: 'up', action: 'tap' }),
  ).rejects.toThrow();
});
test('updates only the active session and ignores stale disconnects', async () => {
  const { coordinator } = setup();
  await coordinator.select(television);
  coordinator.handle({
    type: 'disconnected',
    sessionId: 'old',
    error: new TVError('connectionLost'),
  });
  expect(coordinator.snapshot().status).toBe('connected');
  const capabilities = {
    ...testSession.capabilities,
    text: 'unsupported' as const,
  };
  coordinator.handle({ type: 'capabilities', sessionId: 'old', capabilities });
  coordinator.handle({
    type: 'capabilities',
    sessionId: testSession.sessionId,
    capabilities,
  });
  expect(coordinator.snapshot()).toMatchObject({
    status: 'connected',
    session: { capabilities },
  });
});
test('bounds retries and never retries authentication failures', async () => {
  const { adapter, coordinator } = setup();
  adapter.error = new TVError('connectionLost');
  await coordinator.select(television);
  await jest.runAllTimersAsync();
  expect(adapter.connectionCount).toBe(6);
  expect(coordinator.snapshot().status).toBe('error');
  adapter.error = new TVError('authenticationFailed');
  await coordinator.select(television);
  expect(coordinator.snapshot()).toMatchObject({
    status: 'error',
    error: { code: 'authenticationFailed' },
  });
  expect(jest.getTimerCount()).toBe(0);
});
test.each([
  'authenticationFailed',
  'identityChanged',
  'permissionDenied',
] as const)(
  'preserves %s until an explicit retry, including across background and foreground',
  async (code) => {
    const { adapter, coordinator } = setup();
    adapter.error = new TVError(code);
    await coordinator.select(television);
    const attempts = adapter.connectionCount;
    await coordinator.resume();
    await coordinator.suspend();
    await coordinator.resume();
    expect(adapter.connectionCount).toBe(attempts);
    expect(coordinator.snapshot()).toMatchObject({
      status: 'error',
      error: { code },
    });
    expect(jest.getTimerCount()).toBe(0);
    adapter.error = null;
    await coordinator.select(television);
    expect(coordinator.snapshot().status).toBe('connected');
  },
);
test('reconnects without replaying commands', async () => {
  const { adapter, coordinator } = setup();
  await coordinator.select(television);
  await coordinator.send({ type: 'key', key: 'up', action: 'tap' });
  coordinator.handle({
    type: 'disconnected',
    sessionId: testSession.sessionId,
    error: new TVError('connectionLost'),
  });
  await jest.runAllTimersAsync();
  expect(adapter.connectionCount).toBe(2);
  expect(adapter.sent).toHaveLength(1);
});
test('cancels retries while backgrounded and reconnects on resume', async () => {
  const { coordinator, adapter } = setup();
  await coordinator.select(television);
  await coordinator.suspend();
  expect(jest.getTimerCount()).toBe(0);
  await coordinator.resume();
  expect(adapter.connectionCount).toBe(2);
});
test('resumes a saved selection and forgets an active TV safely', async () => {
  const { coordinator, repository, adapter } = setup();
  repository.save(television);
  await coordinator.resume();
  expect(coordinator.snapshot().status).toBe('connected');
  await coordinator.forget(television.id);
  expect(adapter.forgotten).toEqual([television.id]);
  expect(coordinator.snapshot().status).toBe('disconnected');
  await coordinator.resume();
  expect(adapter.connectionCount).toBe(1);
});
test('cleans up stale connection results after cancellation', async () => {
  const { coordinator, adapter } = setup();
  let resolve: ((session: TVSession) => void) | undefined;
  let markEntered = (): void => {};
  const entered = new Promise<void>((done) => {
    markEntered = done;
  });
  adapter.connectImpl = () => {
    markEntered();
    return new Promise((done) => {
      resolve = done;
    });
  };
  const selecting = coordinator.select(television);
  await entered;
  await coordinator.disconnect();
  resolve?.(testSession);
  await selecting;
  expect(coordinator.snapshot().status).toBe('disconnected');
  expect(adapter.disconnected).toContain(testSession.sessionId);
});
test('cleans up a stale pairing result', async () => {
  const { coordinator, adapter } = setup(false);
  let resolve: ((challenge: PairingChallenge) => void) | undefined;
  let markEntered = (): void => {};
  const entered = new Promise<void>((done) => {
    markEntered = done;
  });
  adapter.beginImpl = () => {
    markEntered();
    return new Promise((done) => {
      resolve = done;
    });
  };
  const selecting = coordinator.select(television);
  await entered;
  await coordinator.disconnect();
  resolve?.({
    pairingId: 'old',
    encoding: 'hex',
    length: 6,
    expiresAt: Date.now() + 1000,
  });
  await selecting;
  expect(adapter.cancelled).toContain('old');
});
test('invalid codes can be retried and expired challenges fail', async () => {
  const { coordinator, adapter, notices } = setup(false);
  await coordinator.select(television);
  await expect(coordinator.submit('bad')).rejects.toThrow();
  adapter.submitError = new TVError('invalidCode');
  await expect(coordinator.submit('ABCDEF')).rejects.toThrow();
  expect(notices).toHaveBeenCalled();
  expect(coordinator.snapshot().status).toBe('pairing');
  await jest.advanceTimersByTimeAsync(120001);
  await expect(coordinator.submit('ABCDEF')).rejects.toThrow();
  expect(coordinator.snapshot().status).toBe('error');
});
test('cancels pairing on device switches and ignores submit outside pairing', async () => {
  const { coordinator, adapter } = setup(false);
  await coordinator.submit('ABCDEF');
  expect(adapter.connectionCount).toBe(0);
  await coordinator.select(television);
  await coordinator.select({ ...television, id: 'other' });
  expect(adapter.cancelled).toContain('pairing-1');
});
