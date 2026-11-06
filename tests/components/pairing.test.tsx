import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

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

test('Done keeps invalid entry editable and dismisses the keyboard for a valid submission', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  const submit = jest.fn().mockResolvedValue(undefined);
  try {
    await render(<PairingForm onSubmit={submit} />);
    const input = screen.getByLabelText('TV pairing code');
    await fireEvent.changeText(input, 'ZZ1234');
    await fireEvent(input, 'submitEditing');
    expect(submit).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    await fireEvent.changeText(input, 'ab12ef');
    await fireEvent(input, 'submitEditing');
    expect(submit).toHaveBeenCalledWith('AB12EF');
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('TV pairing code').props.value).toBe('');
  } finally {
    dismiss.mockRestore();
  }
});
