import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput } from 'react-native';

import { failure } from '../../core/tv/errors';
import { pairingCode } from '../../core/tv/validation';
import { Button } from '../../shared/components/Button';
import { Copy } from '../../shared/components/Screen';
import { tokens, useTheme } from '../../shared/theme';

export function PairingForm({
  onSubmit,
}: {
  onSubmit: (code: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const submit = async (): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const normalized = pairingCode(code);
      Keyboard.dismiss();
      setBusy(true);
      setError(null);
      await onSubmit(normalized);
    } catch (error) {
      setError(failure(error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
      setCode('');
    }
  };
  return (
    <>
      <Copy>Enter the six-character code shown on your TV.</Copy>
      <TextInput
        testID="pairing-code"
        accessibilityLabel="TV pairing code"
        accessibilityHint="Six hexadecimal characters, using zero through nine and A through F"
        value={code}
        onChangeText={(value) => setCode(value.toUpperCase())}
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        keyboardType="ascii-capable"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        editable={!busy}
        placeholder="· · · · · ·"
        placeholderTextColor={colors.muted}
        style={[
          styles.code,
          {
            color: colors.text,
            borderColor: error ? colors.error : colors.line,
          },
        ]}
        onSubmitEditing={() => {
          void submit();
        }}
      />
      <Copy muted>The code can contain letters A–F as well as numbers.</Copy>
      {error && (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      )}
      <Button
        label="Pair securely"
        loading={busy}
        disabled={code.length !== 6}
        onPress={() => {
          void submit();
        }}
      />
    </>
  );
}
const styles = StyleSheet.create({
  code: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    padding: tokens.space.card,
    fontSize: 30,
    letterSpacing: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
});
