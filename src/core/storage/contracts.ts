import type { SavedDevice } from '../tv/types';

export interface Preferences {
  theme: 'system' | 'dark' | 'light';
  haptics: boolean;
  onboarded: boolean;
}
export interface DeviceStorage {
  readDevices(): SavedDevice[];
  writeDevices(devices: SavedDevice[]): void;
  readSelected(): string | null;
  writeSelected(id: string | null): void;
}
export interface CredentialReferences {
  get(deviceId: string): Promise<string | null>;
  set(deviceId: string, reference: string): Promise<void>;
  delete(deviceId: string): Promise<void>;
}
