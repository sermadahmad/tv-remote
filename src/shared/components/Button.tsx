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
        {
          backgroundColor: secondary
            ? theme.colors.raised
            : theme.colors.accent,
          opacity: inactive ? 0.45 : pressed ? 0.7 : 1,
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
    minHeight: tokens.target,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { fontSize: tokens.type.body, fontWeight: '600', textAlign: 'center' },
});
