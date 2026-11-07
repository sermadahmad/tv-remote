import { Linking } from 'react-native';
import {
  getUpdatesBridge,
  type NativeUpdatesBridge,
} from '../../modules/app-updates-native/src';
import {
  PlayUpdateAdapter,
  updatesEnabled,
  updateFixtureEnabled,
} from '../../src/features/app-updates/PlayUpdateAdapter';
import { availableUpdate } from '../mocks/FakeUpdateAdapter';

jest.mock('../../modules/app-updates-native/src', () => ({
  getUpdatesBridge: jest.fn(),
}));
const bridge = {
  check: jest.fn(async (): Promise<unknown> => availableUpdate),
  start: jest.fn(async (): Promise<unknown> => 'accepted'),
  complete: jest.fn(async () => {}),
  addListener: jest.fn(),
};
beforeEach(() => {
  jest
    .mocked(getUpdatesBridge)
    .mockReturnValue(bridge as unknown as NativeUpdatesBridge);
});
test.each([
  ['android', 'com.sermadahmad.tvremote', false, false, true],
  ['android', 'com.sermadahmad.tvremote', true, false, false],
  ['android', 'com.sermadahmad.tvremote', false, true, false],
  ['android', 'com.sermadahmad.tvremote.dev', false, false, false],
  ['android', 'com.sermadahmad.tvremote.uitest', false, true, false],
  ['ios', 'com.sermadahmad.tvremote', false, false, false],
  ['web', null, false, false, false],
] as const)(
  'real Play checks are gated: %s %s',
  (os, id, dev, fixture, expected) => {
    expect(updatesEnabled(os, id, dev, fixture)).toBe(expected);
  },
);
test('native availability, consent and install use the owned typed bridge', async () => {
  const adapter = new PlayUpdateAdapter(true);
  expect(await adapter.check()).toEqual(availableUpdate);
  for (const status of ['accepted', 'cancelled', 'store', 'downloaded']) {
    bridge.start.mockResolvedValueOnce(status);
    expect(await adapter.start()).toBe(status);
  }
  await adapter.complete();
  expect(bridge.complete).toHaveBeenCalledTimes(1);
});
test('missing or disabled modules are actionable and never silently use fake updates', async () => {
  const disabled = new PlayUpdateAdapter(false);
  expect(disabled.subscribe(jest.fn())()).toBeUndefined();
  await expect(disabled.check()).rejects.toThrow('unavailable');
  jest.mocked(getUpdatesBridge).mockReturnValue(null);
  new PlayUpdateAdapter(true).subscribe(jest.fn())();
  await expect(new PlayUpdateAdapter(true).check()).rejects.toThrow(
    'unavailable',
  );
});
test('invalid native results are rejected and malformed events ignored', async () => {
  const adapter = new PlayUpdateAdapter(true);
  const listener = jest.fn();
  const remove = jest.fn();
  bridge.addListener.mockReturnValueOnce({ remove });
  const unsubscribe = adapter.subscribe(listener);
  const callback = bridge.addListener.mock.calls[0]?.[1] as (
    data: unknown,
  ) => void;
  callback({ status: 'downloaded' });
  expect(listener).not.toHaveBeenCalled();
  callback(availableUpdate);
  expect(listener).toHaveBeenCalledWith(availableUpdate);
  unsubscribe();
  expect(remove).toHaveBeenCalledTimes(1);
  bridge.start.mockResolvedValueOnce('unexpected');
  await expect(adapter.start()).rejects.toThrow('Invalid update result');
});
test('store action uses the fixed package and falls back to HTTPS', async () => {
  const open = jest
    .spyOn(Linking, 'openURL')
    .mockRejectedValueOnce(new Error('no Play app'))
    .mockResolvedValue(undefined);
  try {
    await new PlayUpdateAdapter(true).openStore();
    expect(open).toHaveBeenNthCalledWith(
      1,
      'market://details?id=com.sermadahmad.tvremote',
    );
    expect(open).toHaveBeenNthCalledWith(
      2,
      'https://play.google.com/store/apps/details?id=com.sermadahmad.tvremote',
    );
  } finally {
    open.mockRestore();
  }
});

test('update simulation requires the exact UI-test package and both explicit flags', () => {
  expect(
    updateFixtureEnabled('com.sermadahmad.tvremote.uitest', true, true),
  ).toBe(true);
  expect(updateFixtureEnabled('com.sermadahmad.tvremote', true, true)).toBe(
    false,
  );
  expect(
    updateFixtureEnabled('com.sermadahmad.tvremote.uitest', false, true),
  ).toBe(false);
  expect(
    updateFixtureEnabled('com.sermadahmad.tvremote.uitest', true, false),
  ).toBe(false);
});
