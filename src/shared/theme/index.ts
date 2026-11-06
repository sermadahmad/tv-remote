import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../../store/settingsStore';
import palettes from './palette.json';

export const tokens = {
  space: { xs: 4, sm: 8, md: 12, card: 16, lg: 20, page: 24, xl: 28, xxl: 40 },
  radius: { sm: 12, md: 20, lg: 28, pill: 999 },
  type: {
    caption: 12,
    body: 16,
    subtitle: 20,
    compactTitle: 28,
    title: 32,
    hero: 44,
  },
  target: 52,
  tabBarHeight: 64,
  remoteTarget: 64,
  duration: 140,
};
export function useTheme() {
  const system = useColorScheme();
  const preference = useSettingsStore((state) => state.theme);
  const mode =
    preference === 'system'
      ? system === 'light'
        ? 'light'
        : 'dark'
      : preference;
  return { colors: palettes[mode], mode, ...tokens };
}
