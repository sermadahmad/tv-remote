import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

import { HelpContent } from '../features/help/HelpContent';
import {
  helpTopicIds,
  helpTopics,
  resolveHelpTopic,
} from '../features/help/content';
import { report } from '../features/runtime';
import { BrandIllustration } from '../shared/branding/Brand';
import { Button } from '../shared/components/Button';
import { Disclosure } from '../shared/components/Disclosure';
import { Card, Screen } from '../shared/components/Screen';

export default function Help() {
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const selected = resolveHelpTopic(topic);
  const search = (): void => router.dismissTo('/devices');
  return (
    <Screen
      back
      title="Let’s get your TV connected."
      subtitle="No physical remote? Start with your TV’s own power button."
    >
      <BrandIllustration
        kind={selected === 'connection-lost' ? 'connection-lost' : 'no-tv'}
        width={220}
      />
      {[selected, ...helpTopicIds.filter((id) => id !== selected)].map((id) => (
        <Card key={id}>
          <Disclosure
            title={helpTopics[id].title}
            initiallyExpanded={id === selected}
          >
            <HelpContent
              topic={id}
              action={
                id === 'tv-off' ? (
                  <Button label="I’ve turned on my TV" onPress={search} />
                ) : id === 'permissions' ? (
                  <Button
                    label="Open app settings"
                    secondary
                    onPress={() => {
                      void Linking.openSettings().catch(report);
                    }}
                  />
                ) : undefined
              }
            />
          </Disclosure>
        </Card>
      ))}
      <Button label="Search again" onPress={search} />
    </Screen>
  );
}
