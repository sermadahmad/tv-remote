import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Linking, Text } from 'react-native';

import Devices from '../../src/app/(tabs)/devices';
import Help from '../../src/app/help';
import Onboarding from '../../src/app/onboarding';
import Index from '../../src/app/index';
import Pairing from '../../src/app/pairing';
import type { TVFailure, TVTarget } from '../../src/core/tv/types';
import {
  helpTopicIds,
  resolveHelpTopic,
} from '../../src/features/help/content';
import { userMessage } from '../../src/features/help/presentation';
import { connection } from '../../src/features/runtime';
import { useDeviceStore } from '../../src/store/deviceStore';
import { useSettingsStore } from '../../src/store/settingsStore';

const refresh = jest.fn();
const target: TVTarget = {
  id: 'test',
  name: 'Living room',
  protocol: 'android-tv-v2',
  host: '192.168.1.25',
  port: 6466,
  pairingPort: 6467,
  serviceName: 'test',
};
let mockScan = {
  status: 'empty',
  devices: [] as TVTarget[],
  error: null as TVFailure | null,
  refresh,
};
jest.mock('../../src/features/discovery/useDiscovery', () => ({
  useDiscovery: () => mockScan,
}));
jest.mock('../../src/features/runtime', () => ({
  connection: {
    select: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    submit: jest.fn().mockResolvedValue(undefined),
    snapshot: jest.fn().mockReturnValue({ status: 'disconnected' }),
  },
  report: jest.fn(),
}));
const routes = {
  _layout: () => (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
  ),
  index: Index,
  onboarding: Onboarding,
  help: Help,
  devices: Devices,
  pairing: Pairing,
  remote: () => <Text>Existing remote</Text>,
};
beforeEach(() => {
  jest.mocked(connection.snapshot).mockReturnValue({ status: 'disconnected' });
  mockScan = { status: 'empty', devices: [], error: null, refresh };
  useDeviceStore.setState({
    connection: { status: 'disconnected' },
    selected: null,
    notice: null,
  });
  useSettingsStore.setState({ onboarded: false, theme: 'light' });
});

test('first launch explains power, home Wi-Fi and a code, then keeps the existing onboarding preference', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  expect(screen.getByText('Let’s connect your TV.')).toBeVisible();
  expect(
    screen.getByText(/No remote\? Use your TV’s own power button/),
  ).toBeVisible();
  expect(screen.getByText(/search for your TV automatically/)).toBeVisible();
  expect(screen.queryByLabelText('TV IP address')).toBeNull();
  await fireEvent.press(screen.getByText('Find my TV'));
  expect(screen).toHavePathname('/devices');
  expect(useSettingsStore.getState().onboarded).toBe(true);
});

test('subsequent launches go to the existing Remote route without replaying setup', async () => {
  useSettingsStore.setState({ onboarded: true });
  await renderRouter(routes, { initialUrl: '/' });
  expect(screen).toHavePathname('/remote');
});

test('an empty search offers retry and missing-remote help without requiring an address', async () => {
  await renderRouter(routes, { initialUrl: '/devices' });
  expect(screen.getByText('We couldn’t find your TV.')).toBeVisible();
  expect(screen.getByText(/Turn on your TV/)).toBeVisible();
  expect(screen.queryByText('Connect using IP address')).toBeNull();
  await fireEvent.press(screen.getByText('Search again'));
  expect(refresh).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText('Need help?'));
  expect(screen).toHavePathname('/help');
  expect(screen.getByText(/Look underneath the screen/)).toBeVisible();
  expect(
    screen.getByText(/replacement remote or another supported input device/),
  ).toBeVisible();
  await fireEvent.press(screen.getByText('I’ve turned on my TV'));
  expect(screen).toHavePathname('/devices');
});

test('advanced manual input validates locally, explains finding the address, preserves input on help return and cancels', async () => {
  await renderRouter(routes, { initialUrl: '/devices' });
  await fireEvent.press(screen.getByText('Advanced connection options'));
  expect(
    screen.getByRole('button', { name: 'Advanced connection options' }).props
      .accessibilityState.expanded,
  ).toBe(true);
  await fireEvent.press(screen.getByText('Connect using IP address'));
  await fireEvent.changeText(screen.getByLabelText('TV IP address'), '8.8.8.8');
  await fireEvent.press(screen.getByText('Connect to this address'));
  expect(connection.select).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(
    /four numbers separated by dots/,
  );
  await fireEvent.press(screen.getByText('Help me find the address'));
  expect(screen.getByText(/router’s app or administration page/)).toBeVisible();
  await fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen.getByLabelText('TV IP address').props.value).toBe('8.8.8.8');
  await fireEvent.press(screen.getByText('Cancel manual connection'));
  expect(screen.queryByLabelText('TV IP address')).toBeNull();
});

test('valid private address uses the existing selection operation', async () => {
  await renderRouter(routes, { initialUrl: '/devices' });
  await fireEvent.press(screen.getByText('Advanced connection options'));
  await fireEvent.press(screen.getByText('Connect using IP address'));
  await fireEvent.changeText(
    screen.getByLabelText('TV IP address'),
    '192.168.1.25',
  );
  await fireEvent.press(screen.getByText('Connect to this address'));
  expect(connection.select).toHaveBeenCalledWith(
    expect.objectContaining({ host: '192.168.1.25' }),
  );
  expect(screen).toHavePathname('/pairing');
});

test('permission denial has a settings action and does not report a generic empty search', async () => {
  const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  mockScan = {
    ...mockScan,
    status: 'error',
    error: {
      code: 'permissionDenied',
      message: 'raw transport message',
      retryable: false,
    },
  };
  try {
    await renderRouter(routes, { initialUrl: '/devices' });
    expect(screen.queryByText('We couldn’t find your TV.')).toBeNull();
    expect(screen.queryByText('raw transport message')).toBeNull();
    await fireEvent.press(screen.getByText('Open settings'));
    expect(settings).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText('Need help?'));
    expect(screen.getByText(/Some Android versions do not show/)).toBeVisible();
  } finally {
    settings.mockRestore();
  }
});

test('different-network guidance is practical without requiring router configuration', async () => {
  await renderRouter(routes, { initialUrl: '/help?topic=network' });
  expect(screen.getAllByText(/same home network/).length).toBeGreaterThan(0);
  expect(
    screen.getByText(/do not need to change router settings/),
  ).toBeVisible();
  await fireEvent.press(screen.getByLabelText('Go back'));
  expect(screen).toHavePathname('/devices');
});

test('pairing help is inline and leaves the active attempt and entered code untouched', async () => {
  useDeviceStore.setState({
    selected: target,
    connection: {
      status: 'pairing',
      deviceId: target.id,
      challenge: {
        pairingId: 'p',
        encoding: 'hex',
        length: 6,
        expiresAt: Date.now() + 10000,
      },
    },
  });
  jest
    .mocked(connection.snapshot)
    .mockReturnValue(useDeviceStore.getState().connection);
  await renderRouter(routes, { initialUrl: '/pairing' });
  await fireEvent.changeText(
    screen.getByLabelText('TV pairing code'),
    'AB12EF',
  );
  await fireEvent.press(screen.getByText('No code appeared?'));
  expect(screen).toHavePathname('/pairing');
  expect(screen.getByLabelText('TV pairing code').props.value).toBe('AB12EF');
  expect(connection.disconnect).not.toHaveBeenCalled();
  await act(async () =>
    useDeviceStore.setState({
      connection: {
        status: 'error',
        deviceId: target.id,
        error: {
          code: 'pairingRejected',
          message: 'unsafe native detail',
          retryable: false,
        },
      },
    }),
  );
  expect(screen.getByText(/That code did not work/)).toBeVisible();
  expect(screen.queryByText('unsafe native detail')).toBeNull();
});

test('untrusted topic parameters fall back to a known topic and errors never expose raw native messages', () => {
  expect(resolveHelpTopic(['tv-off'])).toBe('network');
  expect(resolveHelpTopic('__proto__')).toBe('network');
  for (const topic of helpTopicIds) expect(resolveHelpTopic(topic)).toBe(topic);
  expect(
    userMessage({
      code: 'connectionLost',
      message: 'TLS socket ECONNREFUSED',
      retryable: true,
    }),
  ).not.toMatch(/TLS|socket|ECONNREFUSED/);
});
