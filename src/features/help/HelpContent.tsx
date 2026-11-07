import { Fragment, type ReactNode } from 'react';

import { Copy } from '../../shared/components/Screen';
import { helpTopics, type HelpTopicId } from './content';

export function HelpContent({
  topic,
  action,
}: {
  topic: HelpTopicId;
  action?: ReactNode;
}) {
  const content = helpTopics[topic];
  return (
    <>
      {content.paragraphs.map((text, index) => (
        <Fragment key={text}>
          <Copy>{text}</Copy>
          {index === 0 && action}
        </Fragment>
      ))}
      {'checklist' in content &&
        content.checklist.map((text) => <Copy key={text}>• {text}</Copy>)}
    </>
  );
}
