import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useSettingsStore } from '../../store/settingsStore';
import { tokens, useTheme } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
  testID?: string;
}
export function Button({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  secondary = false,
  compact = false,
  accessibilityHint,
  testID,
}: Props) {
  const theme = useTheme();
  const haptics = useSettingsStore((state) => state.haptics);
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      disabled={inactive}
      onPress={() => {
        if (haptics)
          void Haptics.selectionAsync().catch(() => {
            /* Haptics may be unavailable on a simulator. */
          });
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        {
          backgroundColor: secondary
            ? pressed
              ? theme.colors.surface
              : theme.colors.raised
            : pressed
              ? theme.colors.accentPressed
              : theme.colors.accent,
          borderColor: secondary ? theme.colors.line : theme.colors.accentText,
          opacity: inactive ? 0.45 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={secondary ? theme.colors.text : theme.colors.onAccent}
        />
      ) : (
        icon
      )}
      <Text
        style={[
          styles.label,
          compact && styles.compactLabel,
          { color: secondary ? theme.colors.text : theme.colors.onAccent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    minHeight: tokens.target,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  compactButton: {
    minHeight: tokens.remoteTarget,
    paddingHorizontal: tokens.space.sm,
  },
  compactLabel: { fontSize: tokens.type.caption },
  label: {
    fontSize: tokens.type.body,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});
