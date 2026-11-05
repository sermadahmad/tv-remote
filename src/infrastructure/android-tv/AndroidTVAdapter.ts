import { uuid } from 'expo';

import { getNativeBridge } from '../../../modules/tv-remote-native/src';
import type { NativeTVBridge } from '../../../modules/tv-remote-native/src';
import type { CredentialReferences } from '../../core/storage/contracts';
import type { TVAdapter } from '../../core/tv/TVAdapter';
import { failure, throwIfAborted, TVError } from '../../core/tv/errors';
import type {
  CommandReceipt,
  PairingChallenge,
  RemoteCommand,
  TVEvent,
  TVSession,
  TVTarget,
} from '../../core/tv/types';
import { pairingCode } from '../../core/tv/validation';
import * as decode from './decoders';

export class AndroidTVAdapter implements TVAdapter {
  private readonly pairingTargets = new Map<string, TVTarget>();
  constructor(
    private readonly references: CredentialReferences,
    private readonly native: () => NativeTVBridge | null = getNativeBridge,
  ) {}
  private bridge(): NativeTVBridge {
    const bridge = this.native();
    if (!bridge) throw new TVError('nativeUnavailable');
    return bridge;
  }

  subscribe(listener: (event: TVEvent) => void): () => void {
    const bridge = this.native();
    if (!bridge) return () => {};
    const subscription = bridge.addListener('onTVEvent', (value) => {
      try {
        listener(decode.event(value));
      } catch (error) {
        listener({ type: 'error', error: failure(error) });
      }
    });
    return () => subscription.remove();
  }

  private async operation<T>(
    signal: AbortSignal,
    action: (id: string) => Promise<T>,
    cleanup?: (result: T) => Promise<void>,
  ): Promise<T> {
    throwIfAborted(signal);
    const bridge = this.bridge();
    const id = uuid.v4();
    await bridge.ensureLocalNetworkPermission();
    throwIfAborted(signal);
    const abort = (): void => {
      void bridge.cancelOperation(id).catch(() => {
        /* The operation may already have completed. */
      });
    };
    signal.addEventListener('abort', abort, { once: true });
    try {
      const result = await action(id);
      if (signal.aborted && cleanup) await cleanup(result);
      throwIfAborted(signal);
      return result;
    } finally {
      signal.removeEventListener('abort', abort);
    }
  }

  async startDiscovery(signal: AbortSignal): Promise<void> {
    await this.operation(signal, (id) => this.bridge().startDiscovery(id));
  }
  async stopDiscovery(): Promise<void> {
    await this.bridge().stopDiscovery();
  }
  async beginPairing(
    target: TVTarget,
    signal: AbortSignal,
  ): Promise<PairingChallenge> {
    const result = decode.challenge(
      await this.operation(
        signal,
        (id) => this.bridge().beginPairing(id, target),
        (result) =>
          this.bridge().cancelPairing(
            decode.string(decode.record(result).pairingId),
          ),
      ),
    );
    this.pairingTargets.set(result.pairingId, target);
    return result;
  }
  async submitPairingCode(pairingId: string, code: string): Promise<TVTarget> {
    const normalized = pairingCode(code);
    const target = this.pairingTargets.get(pairingId);
    if (!target) throw new TVError('pairingTimeout');
    const result = decode.record(
      await this.bridge().submitPairingCode(pairingId, normalized),
    );
    const deviceId = decode.string(result.deviceId);
    if (!/^androidtv:[A-Za-z0-9_-]{43}$/.test(deviceId))
      throw new TVError('protocolFailure');
    try {
      await this.references.set(deviceId, decode.string(result.credentialRef));
      return { ...target, id: deviceId, identity: 'authenticated' };
    } catch {
      await this.bridge().forgetCredentials(deviceId);
      throw new TVError('storageFailure');
    } finally {
      this.pairingTargets.delete(pairingId);
    }
  }
  async cancelPairing(pairingId: string): Promise<void> {
    this.pairingTargets.delete(pairingId);
    await this.bridge().cancelPairing(pairingId);
  }
  async connect(target: TVTarget, signal: AbortSignal): Promise<TVSession> {
    const reference = await this.references.get(target.id);
    if (!reference) throw new TVError('authenticationFailed');
    return decode.session(
      await this.operation(
        signal,
        (id) => this.bridge().connect(id, target, reference),
        (result) =>
          this.bridge().disconnect(
            decode.string(decode.record(result).sessionId),
          ),
      ),
    );
  }
  async send(
    sessionId: string,
    command: RemoteCommand,
  ): Promise<CommandReceipt> {
    const commandId = uuid.v4();
    await this.bridge().send(sessionId, commandId, JSON.stringify(command));
    return { commandId, status: 'written', confirmation: 'unavailable' };
  }
  async releaseKeys(sessionId: string): Promise<void> {
    await this.bridge().releaseKeys(sessionId);
  }
  async disconnect(sessionId: string): Promise<void> {
    await this.bridge().disconnect(sessionId);
  }
  async forgetCredentials(deviceId: string): Promise<void> {
    await this.bridge().forgetCredentials(deviceId);
  }
}
