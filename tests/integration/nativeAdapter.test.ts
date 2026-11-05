import { AndroidTVAdapter } from '../../src/infrastructure/android-tv/AndroidTVAdapter';
import type { CredentialReferences } from '../../src/core/storage/contracts';
import { television, testSession } from '../mocks/FakeTVAdapter';

const mockBridge = {
  ensureLocalNetworkPermission: jest.fn().mockResolvedValue(undefined),
  startDiscovery: jest.fn().mockResolvedValue(undefined),
  cancelOperation: jest.fn().mockResolvedValue(undefined),
  beginPairing: jest.fn(),
  submitPairingCode: jest.fn(),
  cancelPairing: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(),
  disconnect: jest.fn().mockResolvedValue(undefined),
  forgetCredentials: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../modules/tv-remote-native/src', () => ({
  getNativeBridge: () => mockBridge,
}));
jest.mock('expo', () => ({ uuid: { v4: () => 'operation' } }));

let references: CredentialReferences;
beforeEach(() => {
  jest.clearAllMocks();
  references = {
    get: jest.fn().mockResolvedValue('native-reference'),
    set: jest.fn(),
    delete: jest.fn(),
  };
});

test('closes a native session returned after cancellation instead of losing its identifier', async () => {
  let finish: (value: unknown) => void = () => {};
  mockBridge.connect.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const adapter = new AndroidTVAdapter(references);
  const connecting = adapter.connect(television, controller.signal);
  // Advance reference lookup and permission completion before cancelling the active native call.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  controller.abort();
  finish(testSession);
  await expect(connecting).rejects.toMatchObject({ code: 'cancelled' });
  expect(mockBridge.cancelOperation).toHaveBeenCalledWith('operation');
  expect(mockBridge.disconnect).toHaveBeenCalledWith(testSession.sessionId);
});

test('cancels a challenge returned after the pairing attempt was replaced', async () => {
  let finish: (value: unknown) => void = () => {};
  mockBridge.beginPairing.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const pairing = new AndroidTVAdapter(references).beginPairing(
    television,
    controller.signal,
  );
  await Promise.resolve();
  await Promise.resolve();
  controller.abort();
  finish({
    pairingId: 'late',
    encoding: 'hex',
    length: 6,
    expiresAt: Date.now() + 10000,
  });
  await expect(pairing).rejects.toMatchObject({ code: 'cancelled' });
  expect(mockBridge.cancelPairing).toHaveBeenCalledWith('late');
});

test('adopts the native authenticated identity and removes credentials if reference storage fails', async () => {
  const deviceId = 'androidtv:' + 'A'.repeat(43);
  mockBridge.beginPairing.mockResolvedValue({
    pairingId: 'pair',
    encoding: 'hex',
    length: 6,
    expiresAt: Date.now() + 10000,
  });
  mockBridge.submitPairingCode.mockResolvedValue({
    deviceId,
    credentialRef: 'opaque-native-reference',
  });
  const adapter = new AndroidTVAdapter(references);
  await adapter.beginPairing(television, new AbortController().signal);
  await expect(
    adapter.submitPairingCode('pair', 'a1b2c3'),
  ).resolves.toMatchObject({ id: deviceId, identity: 'authenticated' });
  expect(references.set).toHaveBeenCalledWith(
    deviceId,
    'opaque-native-reference',
  );
  expect(mockBridge.submitPairingCode).toHaveBeenCalledWith('pair', 'A1B2C3');
  await adapter.beginPairing(television, new AbortController().signal);
  jest
    .mocked(references.set)
    .mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(
    adapter.submitPairingCode('pair', 'A1B2C3'),
  ).rejects.toMatchObject({ code: 'storageFailure' });
  expect(mockBridge.forgetCredentials).toHaveBeenCalledWith(deviceId);
});
