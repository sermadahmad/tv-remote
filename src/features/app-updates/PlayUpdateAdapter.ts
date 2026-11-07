import { Linking } from 'react-native';

import { getUpdatesBridge } from '../../../modules/app-updates-native/src';
import buildIdentity from '../../core/buildIdentity.json';
import {
  decodeUpdateInfo,
  type UpdateAdapter,
  type UpdateInfo,
  type StartResult,
} from './contracts';

export function updatesEnabled(
  platform: string,
  applicationId: string | null,
  development: boolean,
  fixture: unknown,
): boolean {
  return (
    platform === 'android' &&
    applicationId === buildIdentity.applicationId &&
    !development &&
    fixture !== true
  );
}
export function updateFixtureEnabled(
  applicationId: string | null,
  fixture: unknown,
  scenario: unknown,
): boolean {
  return (
    applicationId === buildIdentity.uiTestApplicationId &&
    fixture === true &&
    scenario === true
  );
}

export class PlayUpdateAdapter implements UpdateAdapter {
  constructor(readonly enabled: boolean) {}
  private bridge() {
    const bridge = this.enabled ? getUpdatesBridge() : null;
    if (!bridge)
      throw new Error('Updates are unavailable in this installation');
    return bridge;
  }
  subscribe(listener: (info: UpdateInfo) => void): () => void {
    if (!this.enabled) return () => {};
    const subscription = getUpdatesBridge()?.addListener(
      'onUpdateState',
      (event) => {
        try {
          listener(decodeUpdateInfo(event));
        } catch {
          /* Ignore invalid/stale native data. */
        }
      },
    );
    return () => subscription?.remove();
  }
  async check(): Promise<UpdateInfo> {
    return decodeUpdateInfo(await this.bridge().check());
  }
  async start(): Promise<StartResult> {
    const result = await this.bridge().start();
    if (
      result !== 'accepted' &&
      result !== 'cancelled' &&
      result !== 'store' &&
      result !== 'downloaded'
    )
      throw new Error('Invalid update result');
    return result;
  }
  complete(): Promise<void> {
    return this.bridge().complete();
  }
  async openStore(): Promise<void> {
    try {
      await Linking.openURL(
        'market://details?id=' + buildIdentity.applicationId,
      );
    } catch {
      await Linking.openURL(
        'https://play.google.com/store/apps/details?id=' +
          buildIdentity.applicationId,
      );
    }
  }
}
