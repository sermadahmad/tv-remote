import type {
  StartResult,
  UpdateAdapter,
  UpdateInfo,
} from '../../src/features/app-updates/contracts';

export const availableUpdate: UpdateInfo = {
  status: 'available',
  versionCode: 20,
  flexibleAllowed: true,
  bytesDownloaded: 0,
  totalBytes: 0,
};
export class FakeUpdateAdapter implements UpdateAdapter {
  enabled = true;
  info = { ...availableUpdate };
  listeners = new Set<(info: UpdateInfo) => void>();
  check = jest.fn(async () => this.info);
  start = jest.fn(async (): Promise<StartResult> => 'accepted');
  complete = jest.fn(async () => {});
  openStore = jest.fn(async () => {});
  subscribe(listener: (info: UpdateInfo) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  emit(info: Partial<UpdateInfo>) {
    this.info = { ...this.info, ...info };
    this.listeners.forEach((listener) => listener(this.info));
  }
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
