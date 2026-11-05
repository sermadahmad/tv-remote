import type {
  CredentialReferences,
  DeviceStorage,
} from '../../src/core/storage/contracts';
import type { TVAdapter } from '../../src/core/tv/TVAdapter';
import type { TVError } from '../../src/core/tv/errors';
import type {
  CommandReceipt,
  PairingChallenge,
  RemoteCommand,
  SavedDevice,
  TVEvent,
  TVSession,
  TVTarget,
} from '../../src/core/tv/types';

export const television: TVTarget = {
  id: 'test-tv',
  name: 'Test TV',
  protocol: 'android-tv-v2',
  host: '192.168.1.20',
  port: 6466,
  pairingPort: 6467,
  serviceName: 'Test TV',
};
export const testSession: TVSession = {
  sessionId: 'test-session',
  deviceId: television.id,
  capabilities: {
    keys: { up: 'supported', down: 'supported', select: 'supported' },
    text: 'unsupported',
    longPress: 'supported',
  },
};

export class FakeTVAdapter implements TVAdapter {
  readonly listeners = new Set<(event: TVEvent) => void>();
  readonly sent: RemoteCommand[] = [];
  readonly disconnected: string[] = [];
  readonly cancelled: string[] = [];
  readonly forgotten: string[] = [];
  readonly released: string[] = [];
  pairingCount = 0;
  connectionCount = 0;
  discoveryCount = 0;
  stopCount = 0;
  error: TVError | null = null;
  submitError: TVError | null = null;
  forgetError: TVError | null = null;
  connectImpl: ((signal: AbortSignal) => Promise<TVSession>) | null = null;
  beginImpl: (() => Promise<PairingChallenge>) | null = null;
  submitImpl: (() => Promise<TVTarget>) | null = null;
  subscribe(listener: (event: TVEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  emit(event: TVEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
  async startDiscovery(): Promise<void> {
    this.discoveryCount++;
    if (this.error) throw this.error;
  }
  async stopDiscovery(): Promise<void> {
    this.stopCount++;
  }
  async beginPairing(): Promise<PairingChallenge> {
    this.pairingCount++;
    if (this.beginImpl) return this.beginImpl();
    if (this.error) throw this.error;
    return {
      pairingId: 'pairing-1',
      encoding: 'hex',
      length: 6,
      expiresAt: Date.now() + 120000,
    };
  }
  async submitPairingCode(): Promise<TVTarget> {
    if (this.submitImpl) return this.submitImpl();
    if (this.submitError) throw this.submitError;
    return television;
  }
  async cancelPairing(id: string): Promise<void> {
    this.cancelled.push(id);
  }
  async connect(_target: TVTarget, signal: AbortSignal): Promise<TVSession> {
    this.connectionCount++;
    if (this.connectImpl) return this.connectImpl(signal);
    if (this.error) throw this.error;
    return { ...testSession, deviceId: _target.id };
  }
  async send(_id: string, command: RemoteCommand): Promise<CommandReceipt> {
    this.sent.push(command);
    return {
      commandId: 'test-command',
      status: 'written',
      confirmation: 'unavailable',
    };
  }
  async releaseKeys(id: string): Promise<void> {
    this.released.push(id);
  }
  async disconnect(id: string): Promise<void> {
    this.disconnected.push(id);
  }
  async forgetCredentials(id: string): Promise<void> {
    if (this.forgetError) throw this.forgetError;
    this.forgotten.push(id);
  }
}

export class MemoryDevices implements DeviceStorage {
  devices: SavedDevice[] = [];
  selected: string | null = null;
  readDevices(): SavedDevice[] {
    return this.devices;
  }
  writeDevices(devices: SavedDevice[]): void {
    this.devices = devices;
  }
  readSelected(): string | null {
    return this.selected;
  }
  writeSelected(id: string | null): void {
    this.selected = id;
  }
}
export class MemoryReferences implements CredentialReferences {
  values = new Map<string, string>();
  async get(id: string): Promise<string | null> {
    return this.values.get(id) ?? null;
  }
  async set(id: string, reference: string): Promise<void> {
    this.values.set(id, reference);
  }
  async delete(id: string): Promise<void> {
    this.values.delete(id);
  }
}
