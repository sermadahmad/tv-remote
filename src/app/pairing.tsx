import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { PairingForm } from '../features/pairing/PairingForm';
import { connection, report } from '../features/runtime';
import { Button } from '../shared/components/Button';
import { Card, Copy, Screen } from '../shared/components/Screen';
import { useTheme } from '../shared/theme';
import { BrandIllustration } from '../shared/branding/Brand';
import { Disclosure } from '../shared/components/Disclosure';
import { HelpContent } from '../features/help/HelpContent';
import { userMessage } from '../features/help/presentation';
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
            ? 'Enter the code shown on your TV'
            : 'Connecting to your TV.'
      }
      subtitle={selected?.name ?? 'Choose a TV from the device list.'}
    >
      <Card>
        <BrandIllustration kind="pairing" width={180} />
        {state.status === 'pairing' ? (
          <PairingForm onSubmit={(code) => connection.submit(code)} />
        ) : state.status === 'error' ? (
          <>
            <Copy>{userMessage(state.error)}</Copy>
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
            <ActivityIndicator color={colors.accentText} />
            <Copy>
              {state.status === 'reconnecting'
                ? `Trying to reconnect… (${state.attempt} of 5)`
                : 'Waiting for your TV to respond…'}
            </Copy>
          </>
        )}
      </Card>
      <Disclosure title="No code appeared?">
        <HelpContent topic="pairing" />
      </Disclosure>
      <Button label="Cancel connection" secondary onPress={cancel} />
      <Copy muted>
        Your TV connection is saved securely on this phone. The code is never
        saved.
      </Copy>
    </Screen>
  );
}
