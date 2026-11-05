import type { CredentialReferences, DeviceStorage } from '../storage/contracts';
import type { TVAdapter } from './TVAdapter';
import { TVError } from './errors';
import type { SavedDevice, TVTarget } from './types';

export class TVRepository {
  constructor(
    private readonly adapter: TVAdapter,
    private readonly storage: DeviceStorage,
    private readonly references: CredentialReferences,
  ) {}

  list(): SavedDevice[] {
    return this.storage.readDevices();
  }
  identify(target: TVTarget): TVTarget {
    if (target.identity === 'authenticated') return target;
    const direct = this.list().find((item) => item.target.id === target.id);
    if (direct)
      return { ...target, id: direct.target.id, identity: 'authenticated' };
    const saved = [...this.list()]
      .sort((a, b) => b.lastConnectedAt - a.lastConnectedAt)
      .find(
        (item) =>
          item.target.id === target.id ||
          (target.serviceName !== '' &&
            item.target.serviceName === target.serviceName) ||
          (target.serviceName === '' && item.target.host === target.host),
      );
    // Discovery hints locate a credential; only the pinned handshake authenticates it.
    return saved
      ? { ...target, id: saved.target.id, identity: 'authenticated' }
      : target;
  }
  selected(): SavedDevice | undefined {
    return this.list().find(
      ({ target }) => target.id === this.storage.readSelected(),
    );
  }
  async isPaired(deviceId: string): Promise<boolean> {
    return (await this.references.get(deviceId)) !== null;
  }

  save(target: TVTarget): void {
    const devices = this.list();
    const previous = devices.find((item) => item.target.id === target.id);
    const next = {
      target: { ...target, identity: 'authenticated' as const },
      nickname: previous?.nickname ?? target.name,
      lastConnectedAt: Date.now(),
    };
    this.storage.writeDevices([
      ...devices.filter((item) => item.target.id !== target.id),
      next,
    ]);
    this.storage.writeSelected(target.id);
  }

  rename(deviceId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) throw new TVError('storageFailure');
    this.storage.writeDevices(
      this.list().map((item) =>
        item.target.id === deviceId ? { ...item, nickname: trimmed } : item,
      ),
    );
  }

  async forget(deviceId: string): Promise<void> {
    // Delete secrets first. A failed deletion must not leave hidden credentials behind.
    await this.adapter.forgetCredentials(deviceId);
    await this.references.delete(deviceId);
    this.storage.writeDevices(
      this.list().filter((item) => item.target.id !== deviceId),
    );
    if (this.storage.readSelected() === deviceId)
      this.storage.writeSelected(null);
  }
}
