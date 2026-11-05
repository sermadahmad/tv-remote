import { useMemo } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import type { RemoteCommand, RemoteKey } from '../../core/tv/types';
import { useTheme } from '../../shared/theme';

export function Touchpad({ send }: { send: (command: RemoteCommand) => void }) {
  const { colors } = useTheme();
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gesture) => {
          let key: RemoteKey = 'select';
          if (Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 24)
            key =
              Math.abs(gesture.dx) > Math.abs(gesture.dy)
                ? gesture.dx > 0
                  ? 'right'
                  : 'left'
                : gesture.dy > 0
                  ? 'down'
                  : 'up';
          send({ type: 'key', key, action: 'tap' });
        },
      }),
    [send],
  );
  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityLabel="Touchpad. Swipe to navigate, tap to select. Switch to buttons for screen reader controls."
      style={[
        styles.pad,
        { backgroundColor: colors.raised, borderColor: colors.line },
      ]}
    >
      <Text style={{ color: colors.muted, fontSize: 28 }}>· · ·</Text>
      <Text style={{ color: colors.muted }}>
        Swipe to navigate · tap to select
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  pad: {
    minHeight: 240,
    borderWidth: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
});
