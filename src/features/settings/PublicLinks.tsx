import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Text } from 'react-native';

import { publicLinks } from '../../core/publicLinks';
import { Button } from '../../shared/components/Button';
import { Card, Copy } from '../../shared/components/Screen';
import { useTheme } from '../../shared/theme';

export function PublicLinks() {
  const { colors } = useTheme();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async (kind: keyof typeof publicLinks): Promise<void> => {
    if (opening) return;
    setOpening(true);
    setError(null);
    try {
      await Linking.openURL(publicLinks[kind]);
    } catch {
      setError(
        `Couldn’t open ${kind === 'privacy' ? 'the privacy policy' : 'support'}. Try again when online, or visit ${publicLinks[kind]}`,
      );
    } finally {
      setOpening(false);
    }
  };
  return (
    <Card>
      <Copy>Privacy & support</Copy>
      <Button
        label="Privacy policy"
        accessibilityHint="Opens the public privacy policy in your browser"
        secondary
        disabled={opening}
        onPress={() => {
          void open('privacy');
        }}
      />
      <Button
        label="Support"
        accessibilityHint="Opens setup help and contact details in your browser"
        secondary
        disabled={opening}
        onPress={() => {
          void open('support');
        }}
      />
      {error && (
        <Text
          accessibilityLiveRegion="polite"
          selectable
          style={{ color: colors.text }}
        >
          {error}
        </Text>
      )}
    </Card>
  );
}
