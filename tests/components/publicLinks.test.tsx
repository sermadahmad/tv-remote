import * as Linking from 'expo-linking';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PublicLinks } from '../../src/features/settings/PublicLinks';
import { publicLinks } from '../../src/core/publicLinks';

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

test('privacy and support open the correct public HTTPS pages', async () => {
  jest.mocked(Linking.openURL).mockResolvedValue(true);
  await render(<PublicLinks />);
  await fireEvent.press(screen.getByRole('button', { name: 'Privacy policy' }));
  expect(Linking.openURL).toHaveBeenLastCalledWith(publicLinks.privacy);
  await fireEvent.press(screen.getByRole('button', { name: 'Support' }));
  expect(Linking.openURL).toHaveBeenLastCalledWith(publicLinks.support);
});

test('a failed browser launch displays a safe retry message and public address', async () => {
  jest
    .mocked(Linking.openURL)
    .mockRejectedValueOnce(new Error('native secret detail'));
  await render(<PublicLinks />);
  await fireEvent.press(screen.getByRole('button', { name: 'Privacy policy' }));
  expect(screen.getByText(/Couldn’t open the privacy policy/)).toBeVisible();
  expect(
    screen.getByText(/Couldn’t open the privacy policy/).props.children,
  ).toContain(publicLinks.privacy);
  expect(screen.queryByText(/native secret detail/)).toBeNull();
  jest.mocked(Linking.openURL).mockResolvedValue(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Support' }));
  expect(screen.queryByText(/Couldn’t open/)).toBeNull();
});
