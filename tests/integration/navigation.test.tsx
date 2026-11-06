import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

import TabLayout from '../../src/app/(tabs)/_layout';
import Pairing from '../../src/app/pairing';
import type { RemoteCommand } from '../../src/core/tv/types';
import { useDiscovery } from '../../src/features/discovery/useDiscovery';
import { useFocusedCommands } from '../../src/features/remote/useFocusedCommands';
import { connection, discovery } from '../../src/features/runtime';
import { useDeviceStore } from '../../src/store/deviceStore';
import { testSession } from '../mocks/FakeTVAdapter';

jest.mock('../../src/features/runtime', () => ({
  connection: {
    send: jest.fn().mockResolvedValue(undefined),
    releaseKeys: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    snapshot: jest.fn().mockReturnValue({ status: 'disconnected' }),
  },
  discovery: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  },
  report: jest.fn(),
}));

let captureSend: (command: RemoteCommand) => void;
function Remote() {
  const [count, setCount] = useState(0);
  const send = useFocusedCommands(testSession.sessionId);
  useEffect(() => {
    captureSend = send;
  }, [send]);
  return (
    <View>
      <Text>Remote count {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
    </View>
  );
}
function Devices() {
  useDiscovery();
  return <Text>Discovery screen</Text>;
}
function Saved() {
  return (
    <Button title="Pair saved TV" onPress={() => router.push('/pairing')} />
  );
}
const routes = {
  _layout: () => (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
  ),
  '(tabs)/_layout': TabLayout,
  '(tabs)/remote': Remote,
  '(tabs)/devices': Devices,
  '(tabs)/saved': Saved,
  '(tabs)/settings': () => <Text>Settings screen</Text>,
  pairing: Pairing,
};
beforeEach(() => {
  useDeviceStore.setState({
    connection: { status: 'disconnected' },
    selected: null,
  });
});

test('tabs preserve local state, scope discovery to focus, and discard input from an earlier focus', async () => {
  await renderRouter(routes, { initialUrl: '/remote' });
  await fireEvent.press(screen.getByText('Increment'));
  const oldSend = captureSend;
  await act(async () => oldSend({ type: 'key', key: 'up', action: 'press' }));
  expect(connection.send).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText('Devices'));
  expect(discovery.start).toHaveBeenCalledTimes(1);
  expect(connection.releaseKeys).toHaveBeenCalledWith(testSession.sessionId);
  await act(async () => oldSend({ type: 'key', key: 'up', action: 'tap' }));
  expect(connection.send).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText('Settings'));
  expect(discovery.stop).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText('Remote'));
  expect(screen.getByText('Remote count 1')).toBeVisible();
  await act(async () => {
    oldSend({ type: 'key', key: 'up', action: 'tap' });
    captureSend({ type: 'key', key: 'up', action: 'tap' });
  });
  expect(connection.send).toHaveBeenCalledTimes(2);
});

test('pairing cancellation returns to its originating tab and success selects the existing Remote tab', async () => {
  await renderRouter(routes, { initialUrl: '/remote' });
  await fireEvent.press(screen.getByText('Increment'));
  await fireEvent.press(screen.getByText('Saved'));
  await fireEvent.press(screen.getByText('Pair saved TV'));
  await fireEvent.press(screen.getByText('Cancel connection'));
  expect(screen).toHavePathname('/saved');
  await fireEvent.press(screen.getByText('Pair saved TV'));
  await act(async () =>
    useDeviceStore.setState({
      connection: { status: 'connected', session: testSession },
    }),
  );
  expect(screen).toHavePathname('/remote');
  expect(screen.getByText('Remote count 1')).toBeVisible();
});
