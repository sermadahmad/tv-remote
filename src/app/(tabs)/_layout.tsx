import { Tabs } from 'expo-router';
import { Bookmark, Radio, Settings2, Tv } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens, useTheme } from '../../shared/theme';

export const unstable_settings = { initialRouteName: 'remote' };

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: tokens.type.caption, fontWeight: '600' },
        tabBarItemStyle: { minHeight: tokens.target },
        tabBarStyle: {
          height: tokens.tabBarHeight + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
          backgroundColor: colors.background,
          borderTopColor: colors.line,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="remote"
        options={{
          title: 'Remote',
          tabBarIcon: ({ color, size }) => <Tv color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color, size }) => <Radio color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <Bookmark color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings2 color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
