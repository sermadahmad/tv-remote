import * as Application from 'expo-application';
import Constants from 'expo-constants';

import { isFixtureBuild } from '../core/buildVariant';
import { ConnectionCoordinator } from '../core/tv/ConnectionCoordinator';
import { TVRepository } from '../core/tv/TVRepository';
import { failure } from '../core/tv/errors';
import { AndroidTVAdapter } from '../infrastructure/android-tv/AndroidTVAdapter';
import { deviceStorage, references } from '../infrastructure/storage';
import {
  FixtureReferences,
  FixtureTVAdapter,
} from '../infrastructure/testing/FixtureTVAdapter';
import { useDeviceStore } from '../store/deviceStore';
import { DiscoveryService } from './discovery/DiscoveryService';

export const fixtureBuild = isFixtureBuild(
  Constants.expoConfig?.extra?.uiTest,
  Application.applicationId,
);
const credentialReferences = fixtureBuild
  ? new FixtureReferences()
  : references;
const adapter = fixtureBuild
  ? new FixtureTVAdapter(credentialReferences)
  : new AndroidTVAdapter(references);
export const repository = new TVRepository(
  adapter,
  deviceStorage,
  credentialReferences,
);
export const connection = new ConnectionCoordinator(
  adapter,
  repository,
  (state) => {
    useDeviceStore.getState().setConnection(state);
    if (state.status === 'connected') {
      refreshSaved();
      const saved = useDeviceStore
        .getState()
        .saved.find((device) => device.target.id === state.session.deviceId);
      if (saved)
        useDeviceStore.setState({
          selected: { ...saved.target, name: saved.nickname },
        });
    }
  },
  (notice) => useDeviceStore.setState({ notice }),
);
export const discovery = new DiscoveryService(adapter, (state) =>
  useDeviceStore.setState({
    discovered: state.devices,
    discovery: state.status,
    discoveryError: state.error,
  }),
);

export function refreshSaved(): void {
  try {
    useDeviceStore.setState({ saved: repository.list() });
  } catch (error) {
    report(error);
  }
}
export function report(error: unknown): void {
  useDeviceStore.setState({ notice: failure(error) });
}
export function initializeRuntime(): () => void {
  refreshSaved();
  return adapter.subscribe((event) => {
    discovery.handle(event);
    connection.handle(event);
    useDeviceStore.getState().handleEvent(event);
    if (event.type === 'error') report(event.error);
    if (event.type === 'networkChanged') {
      void (event.available ? connection.resume() : connection.suspend()).catch(
        report,
      );
    }
  });
}
