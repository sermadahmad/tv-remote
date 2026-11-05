import { fireEvent, render, screen } from '@testing-library/react-native';

import { DirectionPad } from '../../src/features/remote/DirectionPad';
import { testSession } from '../mocks/FakeTVAdapter';

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
