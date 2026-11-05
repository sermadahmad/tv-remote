import { fireEvent, render, screen } from '@testing-library/react-native';

import { PairingForm } from '../../src/features/pairing/PairingForm';

test('accepts hexadecimal letters, submits once, and clears transient input', async () => {
  const submit = jest.fn().mockResolvedValue(undefined);
  await render(<PairingForm onSubmit={submit} />);
  const input = screen.getByLabelText('TV pairing code');
  await fireEvent.changeText(input, 'ab12ef');
  await fireEvent.press(screen.getByRole('button', { name: 'Pair securely' }));
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledWith('AB12EF');
  expect(screen.getByLabelText('TV pairing code').props.value).toBe('');
});

test('rejects non-hexadecimal input without dispatch', async () => {
  const submit = jest.fn().mockResolvedValue(undefined);
  await render(<PairingForm onSubmit={submit} />);
  await fireEvent.changeText(
    screen.getByLabelText('TV pairing code'),
    'ZZ1234',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Pair securely' }));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeVisible();
});
