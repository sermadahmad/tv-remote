import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { RemoteCommand } from '../../core/tv/types';
import { tokens, useTheme } from '../../shared/theme';
import { useSettingsStore } from '../../store/settingsStore';

export function RemoteButton({
  label,
  icon,
  commandKey,
  send,
  disabled = false,
  longPress = false,
  primary = false,
  iconOnly = false,
}: {
  label: string;
  icon?: ReactNode;
  commandKey: Extract<RemoteCommand, { type: 'key' }>['key'];
  send: (command: RemoteCommand) => void;
  disabled?: boolean;
  longPress?: boolean;
  primary?: boolean;
  iconOnly?: boolean;
}) {
  const { colors } = useTheme();
  const haptics = useSettingsStore((state) => state.haptics);
  const held = useRef(false);
  const suppressTap = useRef(false);
  useEffect(
    () => () => {
      if (held.current)
        send({ type: 'key', key: commandKey, action: 'release' });
      held.current = false;
      suppressTap.current = false;
    },
    [commandKey, send],
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityHint={
        disabled ? 'Unavailable for this connection' : undefined
      }
      disabled={disabled}
      delayLongPress={400}
      onPressIn={() => {
        if (haptics) void Haptics.selectionAsync().catch(() => {});
      }}
      onLongPress={
        longPress
          ? () => {
              held.current = true;
              suppressTap.current = true;
              send({ type: 'key', key: commandKey, action: 'press' });
            }
          : undefined
      }
      onPressOut={() => {
        if (held.current) {
          held.current = false;
          send({ type: 'key', key: commandKey, action: 'release' });
        }
      }}
      onPress={() => {
        if (suppressTap.current) {
          suppressTap.current = false;
          return;
        }
        send({ type: 'key', key: commandKey, action: 'tap' });
      }}
      style={({ pressed }) => [
        styles.button,
        iconOnly && styles.iconButton,
        {
          backgroundColor: primary
            ? pressed
              ? colors.accentPressed
              : colors.accent
            : pressed
              ? colors.surface
              : colors.raised,
          borderColor: primary ? colors.accentText : colors.line,
          borderWidth: 1,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      {icon}
      {!iconOnly && (
        <Text
          style={[
            styles.label,
            { color: primary ? colors.onAccent : colors.text },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: tokens.remoteTarget,
    minWidth: tokens.remoteTarget,
    flex: 1,
    borderRadius: tokens.radius.md,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.space.xs,
  },
  iconButton: {
    minHeight: tokens.target,
    minWidth: tokens.target,
    padding: tokens.space.sm,
  },
  label: { fontSize: tokens.type.caption, fontWeight: '600' },
});
