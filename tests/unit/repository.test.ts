import { TVRepository } from '../../src/core/tv/TVRepository';
import { TVError } from '../../src/core/tv/errors';
import {
  FakeTVAdapter,
  MemoryDevices,
  MemoryReferences,
  television,
} from '../mocks/FakeTVAdapter';

function setup() {
  const adapter = new FakeTVAdapter();
  const devices = new MemoryDevices();
  const references = new MemoryReferences();
  return {
    adapter,
    devices,
    references,
    repository: new TVRepository(adapter, devices, references),
  };
}
test('discovery names locate authenticated IDs while new endpoints stay fresh', () => {
  const { repository } = setup();
  const trusted = { ...television, id: 'authenticated-public-key-id' };
  repository.save(trusted);
  expect(
    repository.identify({ ...television, host: '192.168.1.40' }),
  ).toMatchObject({ id: trusted.id, host: '192.168.1.40' });
  expect(
    repository.identify({
      ...television,
      id: 'different',
      serviceName: 'another',
      host: '192.168.1.41',
    }).id,
  ).toBe('different');
});
test('explicit authenticated selections never switch to a similarly named device', () => {
  const { repository } = setup();
  repository.save({ ...television, id: 'other-identity' });
  const explicit = {
    ...television,
    id: 'explicit-identity',
    identity: 'authenticated' as const,
  };
  expect(repository.identify(explicit).id).toBe('explicit-identity');
});
test('saved devices retain nicknames and update endpoint metadata', () => {
  const { repository } = setup();
  repository.save(television);
  repository.rename(television.id, 'Living room');
  repository.save({ ...television, host: '192.168.1.30' });
  expect(repository.list()).toHaveLength(1);
  expect(repository.selected()).toMatchObject({
    nickname: 'Living room',
    target: { host: '192.168.1.30' },
  });
});
test('rejects empty and oversized nicknames', () => {
  const { repository } = setup();
  for (const name of [' ', 'x'.repeat(61)])
    expect(() => repository.rename(television.id, name)).toThrow(TVError);
});
test('paired status comes from secure references', async () => {
  const { repository, references } = setup();
  expect(await repository.isPaired(television.id)).toBe(false);
  await references.set(television.id, 'opaque');
  expect(await repository.isPaired(television.id)).toBe(true);
});
test('forget deletes native credentials, secure reference, metadata, and selection', async () => {
  const { repository, references, devices, adapter } = setup();
  repository.save(television);
  await references.set(television.id, 'opaque');
  await repository.forget(television.id);
  expect(adapter.forgotten).toEqual([television.id]);
  expect(await references.get(television.id)).toBeNull();
  expect(repository.list()).toEqual([]);
  expect(devices.selected).toBeNull();
});
test('does not hide metadata after a failed credential deletion', async () => {
  const { repository, adapter } = setup();
  repository.save(television);
  adapter.forgetError = new TVError('storageFailure');
  await expect(repository.forget(television.id)).rejects.toThrow();
  expect(repository.list()).toHaveLength(1);
});
test('forgetting another device preserves selection', async () => {
  const { repository, devices } = setup();
  repository.save(television);
  await repository.forget('other');
  expect(devices.selected).toBe(television.id);
  expect(repository.selected()).toBeDefined();
});
