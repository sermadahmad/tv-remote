import { usePathname } from 'expo-router';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import {
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Button } from '../../shared/components/Button';
import { Card, Copy } from '../../shared/components/Screen';
import { useTheme } from '../../shared/theme';
import { useSettingsStore } from '../../store/settingsStore';
import { appUpdates } from './runtime';
import type { UpdateCoordinator } from './UpdateCoordinator';
import type { UpdateSnapshot } from './contracts';

export function UpdateNotice({
  state,
  coordinator,
}: {
  state: UpdateSnapshot;
  coordinator: UpdateCoordinator;
}) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  if (!state.notice) return null;
  const ready = state.notice === 'downloaded';
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ backgroundColor: colors.raised }}
    >
      <ScrollView
        style={{ maxHeight: Math.min(height * 0.4, 280) }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.notice}
      >
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={[styles.title, { color: colors.text }]}
        >
          {ready ? 'Your update is ready' : 'A new version is available'}
        </Text>
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label={
                ready
                  ? 'Restart to update'
                  : state.info?.flexibleAllowed
                    ? 'Update'
                    : 'Open Google Play'
              }
              onPress={() => {
                void (ready ? coordinator.install() : coordinator.update());
              }}
            />
          </View>
          <View style={styles.action}>
            <Button
              label="Later"
              secondary
              onPress={() => coordinator.later()}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function AppUpdateProvider({
  children,
  coordinator = appUpdates,
}: {
  children: ReactNode;
  coordinator?: UpdateCoordinator;
}) {
  const state = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.snapshot,
    coordinator.snapshot,
  );
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const onboarded = useSettingsStore((settings) => settings.onboarded);
  const allowed =
    onboarded && path !== '/' && path !== '/onboarding' && path !== '/pairing';
  useEffect(() => {
    const stop = coordinator.start(AppState.currentState === 'active');
    const lifecycle = AppState.addEventListener('change', (next) =>
      coordinator.onAppState(next),
    );
    return () => {
      lifecycle.remove();
      stop();
    };
  }, [coordinator]);
  useEffect(
    () => coordinator.setPresentationAllowed(allowed),
    [coordinator, allowed],
  );
  const visible = allowed && state.notice !== null;
  return (
    <View style={styles.root}>
      {visible && <UpdateNotice state={state} coordinator={coordinator} />}
      <SafeAreaInsetsContext.Provider
        value={visible ? { ...insets, top: 0 } : insets}
      >
        <View style={styles.root}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

export function UpdatesSettings({
  coordinator = appUpdates,
}: {
  coordinator?: UpdateCoordinator;
}) {
  const state = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.snapshot,
    coordinator.snapshot,
  );
  if (!state.enabled) return null;
  const progress =
    state.info?.status === 'downloading' || state.info?.status === 'pending';
  const percent =
    state.info && state.info.totalBytes > 0
      ? Math.round((state.info.bytesDownloaded / state.info.totalBytes) * 100)
      : null;
  return (
    <Card>
      <Copy>App updates</Copy>
      <Copy muted>
        Google Play checks need internet. Your TV remote still works on your
        home network without internet.
      </Copy>
      {progress && (
        <Copy>
          Downloading update{percent === null ? '…' : ' · ' + percent + '%'}
        </Copy>
      )}
      {state.message && (
        <Text accessibilityLiveRegion="polite">
          <Copy>{state.message}</Copy>
        </Text>
      )}
      <Button
        label="Check for updates"
        loading={state.busy === 'checking'}
        disabled={state.busy !== null}
        onPress={() => {
          void coordinator.check(true);
        }}
      />
      <Button
        label="Open Google Play"
        secondary
        disabled={state.busy !== null}
        onPress={() => {
          void coordinator.openStore();
        }}
      />
    </Card>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  notice: { padding: 12, gap: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { flex: 1, minWidth: 128 },
});
