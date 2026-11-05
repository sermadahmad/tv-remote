import { DISCOVERY_TIMEOUT_MS } from '../../core/config';
import type { TVAdapter } from '../../core/tv/TVAdapter';
import { failure, TVError } from '../../core/tv/errors';
import type { TVEvent, TVFailure, TVTarget } from '../../core/tv/types';

export interface DiscoverySnapshot {
  devices: Record<string, TVTarget>;
  status: 'idle' | 'searching' | 'found' | 'empty' | 'error';
  error: TVFailure | null;
}

export class DiscoveryService {
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private snapshot: DiscoverySnapshot = {
    devices: {},
    status: 'idle',
    error: null,
  };
  private generation = 0;
  private wanted = false;
  constructor(
    private readonly adapter: TVAdapter,
    private readonly changed: (state: DiscoverySnapshot) => void,
  ) {}
  private publish(patch: Partial<DiscoverySnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.changed(this.snapshot);
  }
  async start(): Promise<void> {
    this.wanted = true;
    const generation = ++this.generation;
    await this.stopResources();
    if (generation !== this.generation) return;
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ devices: {}, status: 'searching', error: null });
    try {
      await this.adapter.startDiscovery(controller.signal);
      if (generation !== this.generation) return;
      this.timer = setTimeout(() => {
        void this.finish();
      }, DISCOVERY_TIMEOUT_MS);
    } catch (error) {
      if (generation === this.generation) {
        controller.abort();
        this.controller = null;
        this.publish({ status: 'error', error: failure(error) });
      }
    }
  }
  handle(event: TVEvent): void {
    if (event.type === 'networkChanged' && this.wanted) {
      if (event.available)
        void this.resume().catch((error: unknown) =>
          this.publish({ status: 'error', error: failure(error) }),
        );
      else {
        this.publish({
          status: 'error',
          error: failure(new TVError('networkUnavailable')),
        });
        void this.suspend().catch((error: unknown) =>
          this.publish({ status: 'error', error: failure(error) }),
        );
      }
      return;
    }
    if (!this.controller || this.controller.signal.aborted) return;
    if (event.type === 'discoveryReady')
      this.publish({
        status: Object.keys(this.snapshot.devices).length
          ? 'found'
          : 'searching',
        error: null,
      });
    if (event.type === 'error') {
      this.publish({ status: 'error', error: event.error });
      if (event.error.code !== 'permissionDenied')
        void this.stopResources().catch((error: unknown) =>
          this.publish({ status: 'error', error: failure(error) }),
        );
    }
    if (event.type === 'deviceFound')
      this.publish({
        devices: { ...this.snapshot.devices, [event.target.id]: event.target },
        status: 'found',
        error: null,
      });
    if (event.type === 'deviceLost') {
      const devices = { ...this.snapshot.devices };
      delete devices[event.deviceId];
      this.publish({
        devices,
        status: Object.keys(devices).length ? 'found' : 'searching',
      });
    }
  }
  private async finish(): Promise<void> {
    const generation = this.generation;
    try {
      await this.stopResources();
      if (generation === this.generation && this.snapshot.error === null)
        this.publish({
          status: Object.keys(this.snapshot.devices).length ? 'found' : 'empty',
        });
    } catch (error) {
      this.publish({ status: 'error', error: failure(error) });
    }
  }
  private async stopResources(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
      await this.adapter.stopDiscovery();
    }
  }
  async stop(): Promise<void> {
    this.wanted = false;
    ++this.generation;
    await this.stopResources();
  }
  async suspend(): Promise<void> {
    ++this.generation;
    await this.stopResources();
  }
  async resume(): Promise<void> {
    if (this.wanted && this.controller === null) await this.start();
  }
}
