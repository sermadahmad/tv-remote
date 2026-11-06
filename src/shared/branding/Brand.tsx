import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useTheme } from '../theme';
import { brandArtwork } from './artwork';

type Appearance = 'light' | 'dark' | 'mono';
export type IllustrationKind = keyof typeof brandArtwork.illustrations;

function Artwork({
  xml,
  width,
  ratio,
  label,
}: {
  xml: string;
  width: number;
  ratio: number;
  label?: string | undefined;
}) {
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={{
        width,
        maxWidth: '100%',
        aspectRatio: ratio,
        alignSelf: 'center',
      }}
    >
      <SvgXml
        xml={xml}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        accessible={false}
      />
    </View>
  );
}

export function BrandMark({
  size = 64,
  appearance,
  label,
}: {
  size?: number;
  appearance?: Appearance;
  label?: string;
}) {
  const { mode } = useTheme();
  return (
    <Artwork
      xml={brandArtwork.symbols[appearance ?? mode]}
      width={size}
      ratio={1}
      label={label}
    />
  );
}
export function BrandLogo({
  width = 300,
  appearance,
  label = 'Universal TV Remote',
}: {
  width?: number;
  appearance?: Appearance;
  label?: string;
}) {
  const { mode } = useTheme();
  return (
    <Artwork
      xml={brandArtwork.logos[appearance ?? mode]}
      width={width}
      ratio={5}
      label={label}
    />
  );
}
export function BrandIllustration({
  kind,
  width = 280,
}: {
  kind: IllustrationKind;
  width?: number;
}) {
  const { mode } = useTheme();
  return (
    <Artwork
      xml={brandArtwork.illustrations[kind][mode]}
      width={width}
      ratio={4 / 3}
    />
  );
}
