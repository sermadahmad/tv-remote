import { Stack, usePathname } from 'expo-router';
import * as Network from 'expo-network';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  connection,
  discovery,
  fixtureBuild,
  initializeRuntime,
  report,
} from '../features/runtime';
import { tokens, useTheme } from '../shared/theme';
import { useDeviceStore } from '../store/deviceStore';
import { useSettingsStore } from '../store/settingsStore';

export default function RootLayout() {
  useKeepAwake('tv-remote-foreground');
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const unsubscribe = initializeRuntime();
    if (useSettingsStore.getState().onboarded)
      void connection.resume().catch(report);
    const lifecycle = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        void discovery.suspend().catch(report);
        void connection.suspend().catch(report);
      }
      if (state === 'active') {
        void connection.resume().catch(report);
        void discovery.resume().catch(report);
      }
    });
    const network = fixtureBuild
      ? null
      : Network.addNetworkStateListener((state) => {
          if (AppState.currentState !== 'active') return;
          // This describes the default route. Cellular may remain the default while
          // a usable Wi-Fi LAN has no internet. Native Wi-Fi checks own availability.
          if (
            state.type !== Network.NetworkStateType.WIFI ||
            state.isConnected !== true
          )
            return;
          discovery.handle({ type: 'networkChanged', available: true });
        });
    return () => {
      network?.remove();
      lifecycle.remove();
      unsubscribe();
      void discovery.stop().catch(report);
      void connection.disconnect().catch(report);
    };
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        {fixtureBuild && (
          <SafeAreaView
            edges={['top']}
            style={{ backgroundColor: theme.colors.accent }}
          >
            <Text
              style={{
                backgroundColor: theme.colors.accent,
                color: theme.colors.onAccent,
                textAlign: 'center',
                padding: 8,
                fontWeight: '700',
              }}
            >
              UI TEST · SIMULATED TV · CODE A1B2C3
            </Text>
          </SafeAreaView>
        )}
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reducedMotion ? 'none' : 'slide_from_right',
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen name="onboarding" />
          <Stack.Screen
            name="pairing"
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack>
        <AppNotice />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNotice() {
  const notice = useDeviceStore((state) => state.notice);
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const pathname = usePathname();
  const tabbed = ['/remote', '/devices', '/saved', '/settings'].includes(
    pathname,
  );
  return notice ? (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: theme.colors.raised,
          bottom: bottom + (tabbed ? tokens.tabBarHeight : 0) + 16,
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={{ color: theme.colors.text, flex: 1 }}>
        {notice.message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
        onPress={() => useDeviceStore.setState({ notice: null })}
        style={styles.dismiss}
      >
        <Text style={{ color: theme.colors.accent }}>Dismiss</Text>
      </Pressable>
    </View>
  ) : null;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  notice: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dismiss: { minHeight: 48, justifyContent: 'center' },
});
