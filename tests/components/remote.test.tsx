import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import { DirectionPad } from '../../src/features/remote/DirectionPad';
import { Touchpad } from '../../src/features/remote/Touchpad';
import { testSession } from '../mocks/FakeTVAdapter';

test.each([
  [80, 4, 'left'],
  [-80, 4, 'right'],
  [4, 80, 'up'],
  [4, -80, 'down'],
  [5, 5, 'select'],
])('touchpad gesture (%s, %s) dispatches %s once', async (dx, dy, key) => {
  const factory = jest.spyOn(PanResponder, 'create');
  const send = jest.fn();
  await render(<Touchpad send={send} />);
  const release = factory.mock.calls.at(-1)?.[0].onPanResponderRelease;
  await act(async () =>
    release?.(
      {} as GestureResponderEvent,
      { dx, dy } as PanResponderGestureState,
    ),
  );
  expect(send.mock.calls).toEqual([[{ type: 'key', key, action: 'tap' }]]);
  factory.mockRestore();
});

test('dispatches one tap and respects unsupported controls', async () => {
  const send = jest.fn();
  await render(
    <DirectionPad capabilities={testSession.capabilities} send={send} />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Up' }));
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenLastCalledWith({
    type: 'key',
    key: 'up',
    action: 'tap',
  });
  expect(screen.getByRole('button', { name: 'Left' })).toBeDisabled();
});
test('sends press/release without an extra tap after holding', async () => {
  const send = jest.fn();
  await render(
    <DirectionPad capabilities={testSession.capabilities} send={send} />,
  );
  const up = screen.getByRole('button', { name: 'Up' });
  await fireEvent(up, 'longPress');
  await fireEvent(up, 'pressOut');
  await fireEvent.press(up);
  expect(send.mock.calls.map((args) => args[0])).toEqual([
    { type: 'key', key: 'up', action: 'press' },
    { type: 'key', key: 'up', action: 'release' },
  ]);
});
