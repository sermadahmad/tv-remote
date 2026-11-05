import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

import type {
  CredentialReferences,
  DeviceStorage,
  Preferences,
} from '../core/storage/contracts';
import { TVError } from '../core/tv/errors';
import type { SavedDevice } from '../core/tv/types';
import { record, string, target } from './android-tv/decoders';

const storage = createMMKV({ id: 'tv-remote-preferences-v1' });
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const referenceKey = (deviceId: string): string =>
  `tv.${Array.from(deviceId)
    .map((char) => char.codePointAt(0)?.toString(16) ?? '')
    .join('-')}`;

export const references: CredentialReferences = {
  get: (id) => SecureStore.getItemAsync(referenceKey(id), secureOptions),
  set: (id, reference) =>
    SecureStore.setItemAsync(referenceKey(id), reference, secureOptions),
  delete: (id) => SecureStore.deleteItemAsync(referenceKey(id), secureOptions),
};

export const deviceStorage: DeviceStorage = {
  readDevices(): SavedDevice[] {
    const raw = storage.getString('devices');
    if (!raw) return [];
    try {
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) throw new TVError('storageFailure');
      return value.map((entry: unknown) => {
        const item = record(entry);
        if (
          typeof item.lastConnectedAt !== 'number' ||
          !Number.isFinite(item.lastConnectedAt)
        )
          throw new TVError('storageFailure');
        return {
          target: target(item.target),
          nickname: string(item.nickname),
          lastConnectedAt: item.lastConnectedAt,
        };
      });
    } catch {
      throw new TVError('storageFailure');
    }
  },
  writeDevices: (devices) => storage.set('devices', JSON.stringify(devices)),
  readSelected: () => storage.getString('selected') ?? null,
  writeSelected(id) {
    if (id === null) storage.remove('selected');
    else storage.set('selected', id);
  },
};

export const defaultPreferences: Preferences = {
  theme: 'system',
  haptics: true,
  onboarded: false,
};
export function readPreferences(): Preferences {
  const theme = storage.getString('theme');
  return {
    theme: theme === 'dark' || theme === 'light' ? theme : 'system',
    haptics: storage.getBoolean('haptics') ?? true,
    onboarded: storage.getBoolean('onboarded') ?? false,
  };
}
export function writePreferences(preferences: Preferences): void {
  storage.set('theme', preferences.theme);
  storage.set('haptics', preferences.haptics);
  storage.set('onboarded', preferences.onboarded);
}
