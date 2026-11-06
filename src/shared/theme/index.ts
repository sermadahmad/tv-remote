import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../../store/settingsStore';

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
const palettes = {
  dark: {
    background: '#0D1511',
    surface: '#19241D',
    raised: '#223128',
    text: '#F1F6EC',
    muted: '#A7B7AC',
    line: '#304136',
    accent: '#C8EB9B',
    onAccent: '#1D3319',
    error: '#FFB5AB',
  },
  light: {
    background: '#F3F5EE',
    surface: '#FFFFFF',
    raised: '#E7EDDF',
    text: '#192D20',
    muted: '#5C7062',
    line: '#D7E0D1',
    accent: '#3E642C',
    onAccent: '#FFFFFF',
    error: '#A1322A',
  },
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
