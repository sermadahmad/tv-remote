import { router } from 'expo-router';
import {
  ArrowLeft,
  Home,
  Keyboard,
  Minus,
  Play,
  Plus,
  Power,
  SkipBack,
  SkipForward,
  VolumeX,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RemoteCommand } from '../core/tv/types';
import { DirectionPad } from '../features/remote/DirectionPad';
import { RemoteButton } from '../features/remote/RemoteButton';
import { Touchpad } from '../features/remote/Touchpad';
import { connection, report } from '../features/runtime';
import { Button } from '../shared/components/Button';
import { Card, Copy, Screen } from '../shared/components/Screen';
import { tokens, useTheme } from '../shared/theme';
import { useDeviceStore } from '../store/deviceStore';

export default function Remote() {
  const { colors } = useTheme();
  const state = useDeviceStore((store) => store.connection);
  const selected = useDeviceStore((store) => store.selected);
  const volume = useDeviceStore((store) => store.volume);
  const [touchpad, setTouchpad] = useState(false);
  const send = useCallback((command: RemoteCommand): void => {
    void connection.send(command).catch(report);
  }, []);
  if (state.status !== 'connected')
    return (
      <Screen
        title="A moment to reconnect."
        subtitle="Controls will be ready when your TV reconnects."
      >
        <Card>
          <Copy>
            {state.status === 'error'
              ? state.error.message
              : state.status === 'reconnecting'
                ? `Connection interrupted · attempt ${state.attempt} of 5`
                : 'Choose a TV to start watching.'}
          </Copy>
          <Button
            label="Choose a TV"
            onPress={() => router.replace('/devices')}
          />
          {selected && (
            <Button
              label="Reconnect"
              secondary
              onPress={() => {
                router.push('/pairing');
                void connection.select(selected).catch(report);
              }}
            />
          )}
        </Card>
      </Screen>
    );
  const capabilities = state.session.capabilities;
  const supported = (key: keyof typeof capabilities.keys): boolean =>
    capabilities.keys[key] === 'supported';
  return (
    <Screen
      title={selected?.name ?? 'Your TV'}
      eyebrow="YOUR REMOTE"
      subtitle="Connected · Local Wi-Fi"
      compact
      accessory={
        <RemoteButton
          label="Power"
          iconOnly
          icon={<Power color={colors.text} />}
          commandKey="power"
          send={send}
          disabled={!supported('power')}
        />
      }
    >
      <Card compact>
        <View style={styles.cluster}>
          <View style={styles.directions}>
            {touchpad ? (
              <Touchpad send={send} />
            ) : (
              <DirectionPad capabilities={capabilities} send={send} />
            )}
          </View>
          <View style={styles.volume}>
            <Text style={[styles.label, { color: colors.muted }]}>VOL</Text>
            <RemoteButton
              label="Volume up"
              iconOnly
              icon={<Plus color={colors.text} />}
              commandKey="volumeUp"
              send={send}
              disabled={!supported('volumeUp')}
              longPress={capabilities.longPress === 'supported'}
            />
            <RemoteButton
              label="Mute"
              iconOnly
              icon={<VolumeX color={colors.text} />}
              commandKey="mute"
              send={send}
              disabled={!supported('mute')}
            />
            <RemoteButton
              label="Volume down"
              iconOnly
              icon={<Minus color={colors.text} />}
              commandKey="volumeDown"
              send={send}
              disabled={!supported('volumeDown')}
              longPress={capabilities.longPress === 'supported'}
            />
          </View>
        </View>
      </Card>
      <View style={styles.row}>
        <RemoteButton
          label="Back"
          icon={<ArrowLeft color={colors.text} />}
          commandKey="back"
          send={send}
          disabled={!supported('back')}
        />
        <RemoteButton
          label="Home"
          icon={<Home color={colors.text} />}
          commandKey="home"
          send={send}
          disabled={!supported('home')}
        />
        <View style={styles.mode}>
          <Button
            label={touchpad ? 'Use direction buttons' : 'Use touchpad'}
            secondary
            disabled={
              !(['up', 'down', 'left', 'right', 'select'] as const).every(
                supported,
              )
            }
            onPress={() => setTouchpad(!touchpad)}
          />
        </View>
      </View>
      {volume && (
        <Copy muted>
          {volume.muted
            ? 'Muted'
            : `TV volume · ${volume.level} / ${volume.max}`}
        </Copy>
      )}
      <View style={styles.row}>
        <RemoteButton
          label="Previous"
          icon={<SkipBack color={colors.text} />}
          commandKey="previous"
          send={send}
          disabled={!supported('previous')}
        />
        <RemoteButton
          label="Play / Pause"
          icon={<Play color={colors.text} />}
          commandKey="playPause"
          send={send}
          disabled={!supported('playPause')}
        />
        <RemoteButton
          label="Next"
          icon={<SkipForward color={colors.text} />}
          commandKey="next"
          send={send}
          disabled={!supported('next')}
        />
      </View>
      <Button
        label="Keyboard unavailable"
        secondary
        disabled
        icon={<Keyboard color={colors.muted} size={20} />}
        onPress={() => {}}
        accessibilityHint="Text input has not been validated for this connection"
      />
      <Button
        label="Switch TV"
        secondary
        onPress={() => router.replace('/devices')}
      />
      <Copy muted>
        Some controls depend on the TV and the open app. Power works only while
        the TV’s network remains available.
      </Copy>
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: tokens.space.sm },
  cluster: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: tokens.space.md,
  },
  directions: { flex: 1 },
  volume: { width: tokens.target, gap: tokens.space.sm, alignItems: 'stretch' },
  mode: { flex: 1.4, justifyContent: 'center' },
  label: { fontSize: 11, letterSpacing: 2, fontWeight: '600' },
});
