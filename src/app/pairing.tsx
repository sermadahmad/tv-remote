import { router, useFocusEffect } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { PairingForm } from '../features/pairing/PairingForm';
import { connection, report } from '../features/runtime';
import { Button } from '../shared/components/Button';
import { Card, Copy, Screen } from '../shared/components/Screen';
import { useTheme } from '../shared/theme';
import { useDeviceStore } from '../store/deviceStore';

export default function Pairing() {
  const { colors } = useTheme();
  const state = useDeviceStore((store) => store.connection);
  const selected = useDeviceStore((store) => store.selected);
  useEffect(() => {
    if (state.status === 'connected') router.dismissTo('/remote');
  }, [state.status]);
  useFocusEffect(
    useCallback(
      () => () => {
        if (connection.snapshot().status === 'pairing')
          void connection.disconnect().catch(report);
      },
      [],
    ),
  );
  const cancel = (): void => {
    void connection.disconnect().catch(report);
    if (router.canDismiss()) router.dismiss();
    else router.replace('/devices');
  };
  return (
    <Screen
      title={
        state.status === 'error'
          ? 'Couldn’t connect to your TV.'
          : state.status === 'pairing'
            ? 'A small introduction.'
            : 'Connecting to your TV.'
      }
      subtitle={selected?.name ?? 'Choose a TV from the device list.'}
    >
      <Card>
        <ShieldCheck size={36} color={colors.accent} />
        {state.status === 'pairing' ? (
          <PairingForm onSubmit={(code) => connection.submit(code)} />
        ) : state.status === 'error' ? (
          <>
            <Copy>{state.error.message}</Copy>
            {selected && (
              <Button
                label={
                  state.error.code === 'identityChanged' ||
                  state.error.code === 'authenticationFailed'
                    ? 'Pair again'
                    : 'Try again'
                }
                onPress={() => {
                  if (selected)
                    void connection
                      .select(
                        selected,
                        [
                          'identityChanged',
                          'authenticationFailed',
                          'pairingRejected',
                          'pairingTimeout',
                        ].includes(state.error.code),
                      )
                      .catch(report);
                }}
              />
            )}
          </>
        ) : state.status === 'disconnected' ? (
          <Button label="Choose a TV" onPress={cancel} />
        ) : (
          <>
            <ActivityIndicator color={colors.accent} />
            <Copy>
              {state.status === 'reconnecting'
                ? `Reconnecting · attempt ${state.attempt} of 5`
                : 'Waiting for your TV…'}
            </Copy>
          </>
        )}
      </Card>
      <Button label="Cancel connection" secondary onPress={cancel} />
      <Copy muted>
        Pairing credentials are stored securely on this phone. The pairing code
        is never saved.
      </Copy>
    </Screen>
  );
}
