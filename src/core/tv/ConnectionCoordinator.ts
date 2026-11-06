import { CONNECTION_TIMEOUT_MS, RECONNECT_DELAYS_MS } from '../config';
import type { TVAdapter } from './TVAdapter';
import type { TVRepository } from './TVRepository';
import { failure, TVError } from './errors';
import type {
  ConnectionState,
  RemoteCommand,
  TVEvent,
  TVFailure,
  TVTarget,
} from './types';
import { pairingCode, validateCommand } from './validation';

export class ConnectionCoordinator {
  private state: ConnectionState = { status: 'disconnected' };
  private target: TVTarget | null = null;
  private generation = 0;
  private controller: AbortController | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private submitting = false;
  private readonly forgetting = new Map<string, Promise<void>>();

  constructor(
    private readonly adapter: TVAdapter,
    private readonly repository: TVRepository,
    private readonly changed: (state: ConnectionState) => void,
    private readonly notice: (error: TVFailure) => void,
    private readonly random: () => number = Math.random,
  ) {}

  snapshot(): ConnectionState {
    return this.state;
  }
  private publish(state: ConnectionState): void {
    this.state = state;
    this.changed(state);
  }
  private invalidate(): number {
    this.generation += 1;
    this.controller?.abort();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    return this.generation;
  }

  private async closeCurrent(
    state: ConnectionState = this.state,
  ): Promise<void> {
    if (state.status === 'connected') {
      try {
        await this.adapter.releaseKeys(state.session.sessionId);
      } finally {
        await this.adapter.disconnect(state.session.sessionId);
      }
    }
    if (state.status === 'pairing')
      await this.adapter.cancelPairing(state.challenge.pairingId);
  }

  async select(discovered: TVTarget, forcePair = false): Promise<void> {
    let target: TVTarget;
    try {
      target = this.repository.identify(discovered);
    } catch (error) {
      const previous = this.state;
      this.invalidate();
      this.target = null;
      this.publish({
        status: 'error',
        deviceId: discovered.id,
        error: failure(error),
      });
      try {
        await this.closeCurrent(previous);
      } catch (cleanupError) {
        this.notice(failure(cleanupError));
      }
      return;
    }
    if (
      !forcePair &&
      this.target?.id === target.id &&
      ['connected', 'connecting', 'pairing'].includes(this.state.status)
    )
      return;
    const previous = this.state;
    const generation = this.invalidate();
    this.target = target;
    if (this.paused) return;
    this.publish({ status: 'connecting', deviceId: target.id, attempt: 0 });
    try {
      await this.closeCurrent(previous);
      if (generation !== this.generation || this.paused) return;
      const forgetting = this.forgetting.get(target.id);
      if (forgetting) {
        await forgetting;
        if (generation !== this.generation || this.paused) return;
        this.target = target;
      }
      const paired = !forcePair && (await this.repository.isPaired(target.id));
      if (generation !== this.generation || this.paused) return;
      this.controller = new AbortController();
      if (!paired) {
        this.publish({ status: 'connecting', deviceId: target.id, attempt: 0 });
        const challenge = await this.adapter.beginPairing(
          target,
          this.controller.signal,
        );
        if (generation !== this.generation) {
          await this.adapter.cancelPairing(challenge.pairingId);
          return;
        }
        this.publish({ status: 'pairing', deviceId: target.id, challenge });
      } else await this.connect(generation, 0);
    } catch (error) {
      this.failed(error, generation, RECONNECT_DELAYS_MS.length);
    }
  }

  async submit(code: string): Promise<void> {
    if (this.submitting || this.state.status !== 'pairing') return;
    const normalized = pairingCode(code);
    const generation = this.generation;
    const challenge = this.state.challenge;
    this.submitting = true;
    try {
      if (Date.now() > challenge.expiresAt) throw new TVError('pairingTimeout');
      const authenticated = await this.adapter.submitPairingCode(
        challenge.pairingId,
        normalized,
      );
      if (generation !== this.generation) return;
      this.target = authenticated;
      await this.connect(generation, 0);
    } catch (error) {
      const issue = failure(error);
      if (issue.code === 'invalidCode') this.notice(issue);
      else {
        await this.adapter.cancelPairing(challenge.pairingId);
        this.failed(error, generation, 0);
      }
      throw new TVError(issue.code);
    } finally {
      this.submitting = false;
    }
  }

  private async connect(generation: number, attempt: number): Promise<void> {
    const target = this.target;
    if (!target || generation !== this.generation || this.paused) return;
    const controller = new AbortController();
    this.controller = controller;
    this.publish({
      status: attempt === 0 ? 'connecting' : 'reconnecting',
      deviceId: target.id,
      attempt,
    });
    const timer = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);
    try {
      const session = await this.adapter.connect(target, controller.signal);
      if (generation !== this.generation || this.paused) {
        await this.adapter.disconnect(session.sessionId);
        return;
      }
      if (session.deviceId !== target.id) {
        await this.adapter.disconnect(session.sessionId);
        throw new TVError('protocolFailure');
      }
      try {
        this.repository.save(target);
      } catch (error) {
        await this.adapter.disconnect(session.sessionId);
        throw error;
      }
      this.publish({ status: 'connected', session });
    } catch (error) {
      this.failed(
        controller.signal.aborted && generation === this.generation
          ? new TVError('connectionTimeout')
          : error,
        generation,
        attempt,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private failed(error: unknown, generation: number, attempt: number): void {
    if (generation !== this.generation || this.paused) return;
    const issue = failure(error);
    const delay = RECONNECT_DELAYS_MS[attempt];
    if (issue.retryable && delay !== undefined && this.target) {
      this.publish({
        status: 'reconnecting',
        deviceId: this.target.id,
        attempt: attempt + 1,
      });
      this.retryTimer = setTimeout(
        () => {
          void this.connect(generation, attempt + 1);
        },
        delay * (0.8 + this.random() * 0.4),
      );
    } else
      this.publish({
        status: 'error',
        deviceId: this.target?.id ?? null,
        error: issue,
      });
  }

  handle(event: TVEvent): void {
    if (
      event.type === 'disconnected' &&
      this.state.status === 'connected' &&
      event.sessionId === this.state.session.sessionId
    )
      this.failed(new TVError('connectionLost'), this.generation, 0);
    if (
      event.type === 'capabilities' &&
      this.state.status === 'connected' &&
      event.sessionId === this.state.session.sessionId
    )
      this.publish({
        status: 'connected',
        session: { ...this.state.session, capabilities: event.capabilities },
      });
  }

  async send(
    command: RemoteCommand,
    expectedSessionId?: string,
  ): Promise<void> {
    if (
      expectedSessionId !== undefined &&
      (this.state.status !== 'connected' ||
        this.state.session.sessionId !== expectedSessionId)
    )
      return;
    if (this.state.status !== 'connected') throw new TVError('connectionLost');
    validateCommand(command, this.state.session.capabilities);
    await this.adapter.send(this.state.session.sessionId, command);
  }

  async releaseKeys(sessionId: string): Promise<void> {
    if (
      this.state.status === 'connected' &&
      this.state.session.sessionId === sessionId
    )
      await this.adapter.releaseKeys(sessionId);
  }

  async disconnect(): Promise<void> {
    const previous = this.state;
    this.invalidate();
    this.publish({ status: 'disconnected' });
    await this.closeCurrent(previous);
  }
  async suspend(): Promise<void> {
    this.paused = true;
    if (this.state.status === 'error') {
      this.invalidate();
      return;
    }
    await this.disconnect();
  }
  async resume(): Promise<void> {
    this.paused = false;
    if (this.state.status === 'error' && !this.state.error.retryable) return;
    const target = this.target ?? this.repository.selected()?.target;
    if (target) await this.select(target);
  }
  async forget(deviceId: string): Promise<void> {
    const pending = this.forgetting.get(deviceId);
    if (pending) return pending;
    const work = this.forgetOnce(deviceId);
    this.forgetting.set(deviceId, work);
    try {
      await work;
    } finally {
      this.forgetting.delete(deviceId);
    }
  }
  private async forgetOnce(deviceId: string): Promise<void> {
    if (this.target?.id === deviceId) {
      await this.disconnect();
      if (this.target?.id === deviceId) this.target = null;
    }
    await this.repository.forget(deviceId);
  }
}
