import type {
  StartResult,
  UpdateAdapter,
  UpdateInfo,
} from '../../features/app-updates/contracts';

/** Explicit UI-test-only simulation. No Play connection, package install or app restart. */
export class FixtureUpdateAdapter implements UpdateAdapter {
  readonly enabled = true;
  private info: UpdateInfo = {
    status: 'available',
    versionCode: 42,
    flexibleAllowed: true,
    bytesDownloaded: 0,
    totalBytes: 100,
  };
  private listeners = new Set<(info: UpdateInfo) => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  subscribe(listener: (info: UpdateInfo) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) clearTimeout(this.timer);
    };
  }
  check(): Promise<UpdateInfo> {
    return Promise.resolve(this.info);
  }
  private emit(patch: Partial<UpdateInfo>): void {
    this.info = { ...this.info, ...patch };
    this.listeners.forEach((listener) => listener(this.info));
  }
  start(): Promise<StartResult> {
    this.emit({ status: 'downloading', bytesDownloaded: 50 });
    this.timer = setTimeout(
      () => this.emit({ status: 'downloaded', bytesDownloaded: 100 }),
      3000,
    );
    return Promise.resolve('accepted');
  }
  complete(): Promise<void> {
    return Promise.reject(new Error('Simulated installation failure'));
  }
  openStore(): Promise<void> {
    return Promise.resolve();
  }
}
