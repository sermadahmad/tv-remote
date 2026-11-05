import type { CredentialReferences } from '../../core/storage/contracts';
import type { TVAdapter } from '../../core/tv/TVAdapter';
import { throwIfAborted, TVError } from '../../core/tv/errors';
import { REMOTE_KEYS } from '../../core/tv/types';
import type {
  CommandReceipt,
  PairingChallenge,
  RemoteCommand,
  TVCapabilities,
  TVEvent,
  TVSession,
  TVTarget,
} from '../../core/tv/types';

// Explicit UI automation build only. This adapter performs no TV communication.
export const fixtureTV: TVTarget = {
  id: 'fixture-tv',
  name: 'Living Room · Simulated',
  protocol: 'android-tv-v2',
  host: '192.168.1.20',
  port: 6466,
  pairingPort: 6467,
  serviceName: 'fixture',
};
export class FixtureReferences implements CredentialReferences {
  private readonly values = new Map<string, string>();
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
export class FixtureTVAdapter implements TVAdapter {
  private listeners = new Set<(event: TVEvent) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private session: TVSession | null = null;
  constructor(private readonly references: CredentialReferences) {}
  subscribe(listener: (event: TVEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  async startDiscovery(signal: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    this.timer = setTimeout(() => {
      if (!signal.aborted)
        this.listeners.forEach((listener) =>
          listener({ type: 'deviceFound', target: fixtureTV }),
        );
    }, 250);
  }
  async stopDiscovery(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  async beginPairing(
    _target: TVTarget,
    signal: AbortSignal,
  ): Promise<PairingChallenge> {
    throwIfAborted(signal);
    return {
      pairingId: 'fixture-pairing',
      encoding: 'hex',
      length: 6,
      expiresAt: Date.now() + 120000,
    };
  }
  async submitPairingCode(_id: string, code: string): Promise<TVTarget> {
    if (code !== 'A1B2C3') throw new TVError('invalidCode');
    await this.references.set(fixtureTV.id, 'fixture-reference');
    return fixtureTV;
  }
  async cancelPairing(): Promise<void> {}
  async connect(target: TVTarget, signal: AbortSignal): Promise<TVSession> {
    throwIfAborted(signal);
    const capabilities: TVCapabilities = {
      keys: {},
      text: 'unverified',
      longPress: 'supported',
    };
    for (const key of REMOTE_KEYS) capabilities.keys[key] = 'supported';
    this.session = {
      sessionId: 'fixture-session',
      deviceId: target.id,
      capabilities,
    };
    return this.session;
  }
  async send(
    sessionId: string,
    _command: RemoteCommand,
  ): Promise<CommandReceipt> {
    if (this.session?.sessionId !== sessionId)
      throw new TVError('connectionLost');
    return {
      commandId: 'fixture-command',
      status: 'written',
      confirmation: 'unavailable',
    };
  }
  async releaseKeys(): Promise<void> {}
  async disconnect(): Promise<void> {
    this.session = null;
  }
  async forgetCredentials(deviceId: string): Promise<void> {
    await this.references.delete(deviceId);
  }
}
