export type UpdateStatus =
  | 'unsupported'
  | 'upToDate'
  | 'available'
  | 'pending'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'failed'
  | 'cancelled';

export interface UpdateInfo {
  status: UpdateStatus;
  versionCode: number;
  flexibleAllowed: boolean;
  bytesDownloaded: number;
  totalBytes: number;
}
export type StartResult = 'accepted' | 'cancelled' | 'store' | 'downloaded';
export interface UpdateAdapter {
  readonly enabled: boolean;
  subscribe(listener: (info: UpdateInfo) => void): () => void;
  check(): Promise<UpdateInfo>;
  start(): Promise<StartResult>;
  complete(): Promise<void>;
  openStore(): Promise<void>;
}
export interface UpdateEffects {
  releaseKeys(): Promise<void>;
  prepareInstall(): Promise<void>;
  recover(): Promise<void>;
}
export interface UpdateSnapshot {
  enabled: boolean;
  info: UpdateInfo | null;
  busy: 'checking' | 'starting' | 'installing' | null;
  notice: 'available' | 'downloaded' | null;
  message: string | null;
}

const statuses = new Set<unknown>([
  'unsupported',
  'upToDate',
  'available',
  'pending',
  'downloading',
  'downloaded',
  'installing',
  'failed',
  'cancelled',
]);
export function decodeUpdateInfo(value: unknown): UpdateInfo {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid update status');
  const x = value as Record<string, unknown>;
  const integer = (v: unknown): v is number =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  if (
    !statuses.has(x.status) ||
    !integer(x.versionCode) ||
    typeof x.flexibleAllowed !== 'boolean' ||
    !integer(x.bytesDownloaded) ||
    !integer(x.totalBytes) ||
    (x.totalBytes > 0 && x.bytesDownloaded > x.totalBytes)
  )
    throw new Error('Invalid update status');
  return x as unknown as UpdateInfo;
}
