import { UpdateCoordinator } from '../../src/features/app-updates/UpdateCoordinator';
import {
  decodeUpdateInfo,
  type UpdateInfo,
} from '../../src/features/app-updates/contracts';
import {
  availableUpdate,
  deferred,
  FakeUpdateAdapter,
} from '../mocks/FakeUpdateAdapter';

function setup(enabled = true, active = true) {
  const adapter = new FakeUpdateAdapter();
  adapter.enabled = enabled;
  const effects = {
    releaseKeys: jest.fn(async () => {}),
    prepareInstall: jest.fn(async () => {}),
    recover: jest.fn(async () => {}),
  };
  const updates = new UpdateCoordinator(adapter, effects);
  updates.setPresentationAllowed(true);
  const stop = updates.start(active);
  return { adapter, effects, updates, stop };
}

test('quiet startup does not contact Play on disabled variants or while backgrounded', async () => {
  const disabled = setup(false);
  await disabled.updates.check(true);
  expect(disabled.adapter.check).not.toHaveBeenCalled();
  expect(disabled.updates.snapshot().notice).toBeNull();
  const background = setup(true, false);
  expect(background.adapter.check).not.toHaveBeenCalled();
  background.updates.onAppState('active');
  await background.updates.check();
  expect(background.updates.snapshot().notice).toBe('available');
});

test('one check serves concurrent automatic/manual callers and uses Play build codes', async () => {
  const { updates, adapter } = setup();
  const check = updates.check(true);
  await Promise.all([check, updates.check(), updates.check(true)]);
  expect(adapter.check).toHaveBeenCalledTimes(1);
  expect(updates.snapshot()).toMatchObject({
    notice: 'available',
    message: 'A new version is available.',
  });
  expect(updates.snapshot().info?.versionCode).toBe(20);
});

test('Later survives tab changes and inactive/active, but a new background visit reminds again', async () => {
  const { updates } = setup();
  await updates.check();
  updates.later();
  updates.setPresentationAllowed(false);
  updates.setPresentationAllowed(true);
  updates.onAppState('inactive');
  updates.onAppState('active');
  await updates.check();
  expect(updates.snapshot().notice).toBeNull();
  updates.onAppState('background');
  expect(updates.snapshot().notice).toBeNull();
  updates.onAppState('active');
  await updates.check();
  expect(updates.snapshot().notice).toBe('available');
});

test('presentation waits for onboarding/pairing without losing the available update', async () => {
  const { updates } = setup();
  updates.setPresentationAllowed(false);
  await updates.check();
  expect(updates.snapshot().notice).toBeNull();
  updates.setPresentationAllowed(true);
  expect(updates.snapshot().notice).toBe('available');
  updates.later();
  await updates.check(true);
  expect(updates.snapshot().notice).toBe('available');
});

test('offline automatic failure is quiet; manual failure is friendly and does not touch TV state', async () => {
  const { updates, adapter, effects } = setup();
  await updates.check();
  adapter.check.mockRejectedValue(new Error('TLS native detail'));
  await updates.check();
  expect(updates.snapshot().message).toBeNull();
  await updates.check(true);
  expect(updates.snapshot().message).toMatch(/Try again when online/);
  expect(updates.snapshot().message).not.toContain('TLS');
  expect(effects.prepareInstall).not.toHaveBeenCalled();
});

test('a hung check times out and can be retried', async () => {
  jest.useFakeTimers();
  try {
    const { updates, adapter } = setup();
    await updates.check();
    adapter.check.mockImplementationOnce(() => new Promise(() => {}));
    const waiting = updates.check(true);
    await jest.advanceTimersByTimeAsync(10000);
    await waiting;
    expect(updates.snapshot().busy).toBeNull();
    expect(updates.snapshot().message).toMatch(/Couldn’t check/);
    await updates.check(true);
    expect(updates.snapshot().notice).toBe('available');
  } finally {
    jest.useRealTimers();
  }
});

test('download events beat an older availability reply and Later on ready survives rechecks', async () => {
  const { updates, adapter } = setup();
  await updates.check();
  const old = deferred<UpdateInfo>();
  adapter.check.mockReturnValueOnce(old.promise);
  const checking = updates.check();
  adapter.emit({ status: 'downloaded' });
  old.resolve(availableUpdate);
  await checking;
  expect(updates.snapshot().notice).toBe('downloaded');
  updates.later();
  await updates.check();
  expect(updates.snapshot().notice).toBeNull();
  updates.onAppState('background');
  updates.onAppState('active');
  await updates.check();
  expect(updates.snapshot().notice).toBe('downloaded');
});

test('stopping removes native listeners and ignores late checks, then can restart', async () => {
  const { updates, adapter, stop } = setup();
  await updates.check();
  const pending = deferred<UpdateInfo>();
  adapter.check.mockReturnValueOnce(pending.promise);
  const work = updates.check();
  expect(adapter.listeners.size).toBe(1);
  stop();
  expect(adapter.listeners.size).toBe(0);
  pending.resolve({ ...availableUpdate, status: 'downloaded' });
  await work;
  expect(updates.snapshot().notice).toBeNull();
  expect(updates.snapshot().info?.status).toBe('available');
  updates.start();
  await updates.check();
  expect(updates.snapshot().notice).toBe('available');
  const duplicateCleanup = updates.start();
  duplicateCleanup();
  expect(adapter.listeners.size).toBe(1);
});

test.each([true, false])(
  'cancellation never re-prompts on Play return (active callback first: %s)',
  async (activeFirst) => {
    const { updates, adapter, effects } = setup();
    await updates.check();
    const consent = deferred<'cancelled'>();
    adapter.start.mockReturnValueOnce(consent.promise);
    const opening = updates.update();
    await Promise.resolve();
    expect(effects.releaseKeys).toHaveBeenCalledTimes(1);
    expect(effects.prepareInstall).not.toHaveBeenCalled();
    updates.onAppState('background');
    if (activeFirst) updates.onAppState('active');
    consent.resolve('cancelled');
    await opening;
    if (!activeFirst) updates.onAppState('active');
    await updates.check();
    expect(updates.snapshot().notice).toBeNull();
    updates.onAppState('background');
    updates.onAppState('active');
    await updates.check();
    expect(updates.snapshot().notice).toBe('available');
  },
);

test('acceptance hides availability, does not disconnect, and completion requests a separate restart', async () => {
  const { updates, adapter, effects } = setup();
  await updates.check();
  await updates.update();
  await updates.check();
  expect(updates.snapshot().notice).toBeNull();
  expect(effects.releaseKeys).toHaveBeenCalledTimes(1);
  expect(effects.prepareInstall).not.toHaveBeenCalled();
  adapter.emit({ status: 'downloading', bytesDownloaded: 50, totalBytes: 100 });
  expect(updates.snapshot().notice).toBeNull();
  adapter.emit({ status: 'downloaded', bytesDownloaded: 100 });
  expect(updates.snapshot().notice).toBe('downloaded');
  expect(adapter.complete).not.toHaveBeenCalled();
  const order: string[] = [];
  effects.prepareInstall.mockImplementationOnce(async () => {
    order.push('cleanup');
  });
  adapter.complete.mockImplementationOnce(async () => {
    order.push('install');
  });
  await updates.install();
  expect(order).toEqual(['cleanup', 'install']);
  expect(updates.snapshot().info?.status).toBe('installing');
});

test('downloaded result from the fresh native check offers restart without starting another download', async () => {
  const { updates, adapter } = setup();
  await updates.check();
  adapter.info = { ...availableUpdate, status: 'downloaded' };
  adapter.start.mockResolvedValueOnce('downloaded');
  await updates.update();
  await updates.check();
  expect(updates.snapshot().notice).toBe('downloaded');
  expect(adapter.complete).not.toHaveBeenCalled();
});

test.each([false, true])(
  'store fallback preserves current-visit dismissal (native fallback: %s)',
  async (nativeFallback) => {
    const { updates, adapter } = setup();
    await updates.check();
    if (nativeFallback) adapter.start.mockResolvedValueOnce('store');
    else adapter.emit({ flexibleAllowed: false });
    await updates.update();
    expect(adapter.openStore).toHaveBeenCalledTimes(1);
    updates.onAppState('background');
    updates.onAppState('active');
    await updates.check();
    expect(updates.snapshot().notice).toBeNull();
    updates.onAppState('background');
    updates.onAppState('active');
    await updates.check();
    expect(updates.snapshot().notice).toBe('available');
  },
);

test('manual store link has key release and does not create a fresh visit on return', async () => {
  const { updates, adapter, effects } = setup();
  await updates.check();
  await updates.openStore();
  expect(effects.releaseKeys).toHaveBeenCalledTimes(1);
  updates.onAppState('background');
  updates.onAppState('active');
  await updates.check();
  expect(updates.snapshot().notice).toBeNull();
  adapter.openStore.mockRejectedValueOnce(new Error('not exported'));
  await updates.openStore();
  expect(updates.snapshot().message).toMatch(/Couldn’t open Google Play/);
});

test('only one consent flow or store action runs while an update is starting', async () => {
  const { updates, adapter, effects } = setup();
  await updates.check();
  const consent = deferred<'accepted'>();
  adapter.start.mockReturnValueOnce(consent.promise);
  const pending = updates.update();
  await Promise.resolve();
  await Promise.all([
    updates.update(),
    updates.openStore(),
    updates.install(),
    updates.check(true),
  ]);
  expect(adapter.start).toHaveBeenCalledTimes(1);
  expect(adapter.openStore).not.toHaveBeenCalled();
  consent.resolve('accepted');
  await pending;
  expect(effects.prepareInstall).not.toHaveBeenCalled();
});

test('navigation into pairing while releasing keys defers the native prompt', async () => {
  const { updates, effects, adapter } = setup();
  await updates.check();
  const keys = deferred<void>();
  effects.releaseKeys.mockReturnValueOnce(keys.promise);
  const opening = updates.update();
  updates.setPresentationAllowed(false);
  keys.resolve();
  await opening;
  expect(adapter.start).not.toHaveBeenCalled();
});

test('start failure is retryable and never exposes native details', async () => {
  const { updates, adapter } = setup();
  await updates.check();
  adapter.start.mockRejectedValueOnce(new Error('raw binder exception'));
  await updates.update();
  await updates.check();
  expect(updates.snapshot().message).toMatch(/Couldn’t start/);
  expect(updates.snapshot().message).not.toContain('binder');
  expect(updates.snapshot().busy).toBeNull();
  await updates.update();
  expect(adapter.start).toHaveBeenCalledTimes(2);
});

test('install failure resumes existing connection coordination without forgetting data', async () => {
  const { updates, adapter, effects } = setup();
  await updates.check();
  adapter.emit({ status: 'downloaded' });
  adapter.complete.mockRejectedValueOnce(new Error('install failed'));
  await updates.install();
  expect(effects.prepareInstall).toHaveBeenCalledTimes(1);
  expect(effects.recover).toHaveBeenCalledTimes(1);
  expect(updates.snapshot().notice).toBe('downloaded');
  expect(updates.snapshot().message).toMatch(/Couldn’t install/);
  effects.prepareInstall.mockRejectedValueOnce(new Error('cleanup failed'));
  effects.recover.mockRejectedValueOnce(new Error('TV unreachable'));
  await updates.install();
  expect(effects.recover).toHaveBeenCalledTimes(2);
});

test('installation failure while backgrounded leaves recovery to the app foreground lifecycle', async () => {
  const { updates, adapter, effects } = setup();
  await updates.check();
  adapter.emit({ status: 'downloaded' });
  const installing = deferred<void>();
  adapter.complete.mockReturnValueOnce(installing.promise);
  const pending = updates.install();
  await Promise.resolve();
  updates.onAppState('background');
  installing.reject(new Error('failed'));
  await pending;
  expect(effects.recover).not.toHaveBeenCalled();
});

test.each([
  'upToDate',
  'unsupported',
  'pending',
  'downloading',
  'installing',
  'failed',
  'cancelled',
] as const)(
  'manual checks explain %s and never install automatically',
  async (status) => {
    const { updates, adapter } = setup();
    await updates.check();
    adapter.info = { ...availableUpdate, status };
    await updates.check(true);
    expect(updates.snapshot().notice).toBeNull();
    expect(updates.snapshot().message).toBeTruthy();
    await updates.update();
    await updates.install();
    expect(adapter.start).not.toHaveBeenCalled();
    expect(adapter.complete).not.toHaveBeenCalled();
  },
);

test('native download failure is explained independently of TV errors', async () => {
  const { updates, adapter } = setup();
  await updates.check();
  adapter.emit({ status: 'failed' });
  expect(updates.snapshot().message).toMatch(/could not download/);
  expect(updates.snapshot().notice).toBeNull();
});

test.each([
  null,
  [],
  {},
  { ...availableUpdate, status: 'evil' },
  { ...availableUpdate, versionCode: -1 },
  { ...availableUpdate, versionCode: 1.2 },
  { ...availableUpdate, flexibleAllowed: 'yes' },
  { ...availableUpdate, bytesDownloaded: NaN },
  { ...availableUpdate, totalBytes: Infinity },
  { ...availableUpdate, bytesDownloaded: 12, totalBytes: 10 },
])('invalid native update payload is rejected: %p', (value) => {
  expect(() => decodeUpdateInfo(value)).toThrow('Invalid update status');
});
test('valid bounded native progress is accepted', () => {
  expect(
    decodeUpdateInfo({ ...availableUpdate, bytesDownloaded: 1, totalBytes: 3 })
      .bytesDownloaded,
  ).toBe(1);
});
