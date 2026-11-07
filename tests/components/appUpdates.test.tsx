import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Stack, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { AppState, Button, Text, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AppUpdateProvider,
  UpdateNotice,
  UpdatesSettings,
} from '../../src/features/app-updates/UpdateUI';
import { UpdateCoordinator } from '../../src/features/app-updates/UpdateCoordinator';
import { useSettingsStore } from '../../src/store/settingsStore';
import { FakeUpdateAdapter } from '../mocks/FakeUpdateAdapter';

jest.mock('../../src/features/app-updates/runtime', () => ({ appUpdates: {} }));
function setup() {
  const adapter = new FakeUpdateAdapter();
  const effects = {
    releaseKeys: jest.fn(async () => {}),
    prepareInstall: jest.fn(async () => {}),
    recover: jest.fn(async () => {}),
  };
  const coordinator = new UpdateCoordinator(adapter, effects);
  return { adapter, effects, coordinator };
}
const appStateDescriptor = Object.getOwnPropertyDescriptor(
  AppState,
  'currentState',
);
beforeEach(() => {
  Object.defineProperty(AppState, 'currentState', {
    value: 'active',
    configurable: true,
    writable: true,
  });
});
afterEach(() => {
  if (appStateDescriptor)
    Object.defineProperty(AppState, 'currentState', appStateDescriptor);
  jest.restoreAllMocks();
});

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 24, bottom: 24, left: 0, right: 0 },
};

test('Update/Later is accessible, cancellable and does not install automatically', async () => {
  const { coordinator, effects } = setup();
  coordinator.start();
  coordinator.setPresentationAllowed(true);
  await coordinator.check();
  const later = jest.spyOn(coordinator, 'later');
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <UpdateNotice state={coordinator.snapshot()} coordinator={coordinator} />
    </SafeAreaProvider>,
  );
  expect(screen.getByRole('header')).toHaveTextContent(
    'A new version is available',
  );
  expect(screen.getByRole('button', { name: 'Update' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Later' })).toBeVisible();
  await fireEvent.press(screen.getByText('Later'));
  expect(later).toHaveBeenCalledTimes(1);
  expect(effects.prepareInstall).not.toHaveBeenCalled();
});

test('ready notice asks for explicit restart, and non-flexible availability links to Play', async () => {
  const { coordinator, adapter, effects } = setup();
  coordinator.start();
  coordinator.setPresentationAllowed(true);
  await coordinator.check();
  adapter.emit({ status: 'downloaded' });
  const view = await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <UpdateNotice state={coordinator.snapshot()} coordinator={coordinator} />
    </SafeAreaProvider>,
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Restart to update' }),
  );
  expect(effects.prepareInstall).toHaveBeenCalledTimes(1);
  adapter.emit({ status: 'available', flexibleAllowed: false });
  await view.rerender(
    <SafeAreaProvider initialMetrics={metrics}>
      <UpdateNotice state={coordinator.snapshot()} coordinator={coordinator} />
    </SafeAreaProvider>,
  );
  expect(screen.getByText('Open Google Play')).toBeVisible();
});

test('manual Settings check restores a dismissed notice and shows download progress', async () => {
  const { coordinator, adapter } = setup();
  coordinator.start();
  coordinator.setPresentationAllowed(true);
  await coordinator.check();
  coordinator.later();
  await render(<UpdatesSettings coordinator={coordinator} />);
  await fireEvent.press(screen.getByText('Check for updates'));
  expect(screen.getByText('A new version is available.')).toBeVisible();
  expect(coordinator.snapshot().notice).toBe('available');
  await act(async () =>
    adapter.emit({
      status: 'downloading',
      bytesDownloaded: 25,
      totalBytes: 100,
    }),
  );
  expect(screen.getByText('Downloading update · 25%')).toBeVisible();
  await fireEvent.press(screen.getByText('Open Google Play'));
  expect(adapter.openStore).toHaveBeenCalledTimes(1);
});

test('unsupported variants do not show an updates Settings card', async () => {
  const { coordinator, adapter } = setup();
  adapter.enabled = false;
  const disabled = new UpdateCoordinator(adapter, {
    releaseKeys: async () => {},
    prepareInstall: async () => {},
    recover: async () => {},
  });
  await render(<UpdatesSettings coordinator={disabled} />);
  expect(screen.queryByText('App updates')).toBeNull();
  await render(
    <UpdateNotice state={disabled.snapshot()} coordinator={coordinator} />,
  );
  expect(screen.queryByText('Update')).toBeNull();
});

test('root notice defers during setup/pairing and does not remount the navigator when dismissed', async () => {
  const { coordinator } = setup();
  useSettingsStore.setState({ onboarded: false });
  const routes = {
    _layout: () => (
      <SafeAreaProvider initialMetrics={metrics}>
        <AppUpdateProvider coordinator={coordinator}>
          <Stack screenOptions={{ headerShown: false }} />
        </AppUpdateProvider>
      </SafeAreaProvider>
    ),
    onboarding: () => (
      <Button
        title="Finish setup"
        onPress={() => {
          useSettingsStore.setState({ onboarded: true });
          router.replace('/remote');
        }}
      />
    ),
    remote: function Remote() {
      const [count, setCount] = useState(0);
      return (
        <View>
          <Text>Existing remote {count}</Text>
          <Button title="Increment" onPress={() => setCount(count + 1)} />
          <Button title="Pair a TV" onPress={() => router.push('/pairing')} />
        </View>
      );
    },
    pairing: () => <Text>Active pairing</Text>,
  };
  await renderRouter(routes, { initialUrl: '/onboarding' });
  await act(async () => coordinator.check());
  expect(screen.queryByText('A new version is available')).toBeNull();
  await fireEvent.press(screen.getByText('Finish setup'));
  await act(async () => coordinator.check());
  expect(screen.getByText('A new version is available')).toBeVisible();
  await fireEvent.press(screen.getByText('Increment'));
  await fireEvent.press(screen.getByText('Later'));
  expect(screen).toHavePathname('/remote');
  expect(screen.getByText('Existing remote 1')).toBeVisible();
  await act(async () => coordinator.check(true));
  await fireEvent.press(screen.getByText('Pair a TV'));
  expect(screen).toHavePathname('/pairing');
  expect(screen.queryByText('A new version is available')).toBeNull();
});
