import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  brandMark,
  brandMarkAspectRatio,
  brandWordmark,
  brandWordmarkAspectRatio,
  brandWordmarkLight,
} from '@/constants/branding';
import { colors } from '@/constants/tokens';

type LockupSize = 'sm' | 'md' | 'lg';

type Props = {
  /** Horizontal is used on auth screens; stacked is used on the welcome hero. */
  variant?: 'horizontal' | 'stacked';
  size?: LockupSize;
  /** Use the white wordmark over photography or dark green. */
  light?: boolean;
  style?: ViewStyle;
};

const specs: Record<
  LockupSize,
  {
    mark: number;
    wordmark: number;
    gap: number;
    tagline: number;
    tracking: number;
  }
> = {
  sm: { mark: 36, wordmark: 104, gap: 7, tagline: 8, tracking: 0.35 },
  md: { mark: 46, wordmark: 134, gap: 9, tagline: 9, tracking: 0.55 },
  lg: { mark: 72, wordmark: 212, gap: 10, tagline: 13, tracking: 1.1 },
};

export function BrandLockup({
  variant = 'horizontal',
  size = 'md',
  light = false,
  style,
}: Props) {
  const spec = specs[size];
  const wordmarkSource = light ? brandWordmarkLight : brandWordmark;
  const taglineColor = light
    ? 'rgba(214, 238, 202, 0.92)'
    : colors.farmGreenLight;

  const wordmark = (
    <Image
      source={wordmarkSource}
      style={{
        width: spec.wordmark,
        height: spec.wordmark / brandWordmarkAspectRatio,
      }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );

  const tagline = (
    <Text
      style={[
        styles.tagline,
        {
          color: taglineColor,
          fontSize: spec.tagline,
          lineHeight: spec.tagline + 3,
          letterSpacing: spec.tracking,
        },
      ]}
    >
      Farm to You
    </Text>
  );

  const mark = (
    <Image
      source={brandMark}
      style={{
        width: spec.mark,
        height: spec.mark / brandMarkAspectRatio,
      }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );

  return (
    <View
      style={[
        variant === 'horizontal' ? styles.horizontal : styles.stacked,
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="TheFarmYard, Farm to You"
    >
      {mark}

      <View
        style={[
          styles.wordmarkColumn,
          {
            marginLeft:
              variant === 'horizontal' ? spec.gap : 0,
            marginTop:
              variant === 'stacked' ? Math.max(2, spec.gap / 2) : 0,
          },
        ]}
      >
        {wordmark}
        {tagline}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stacked: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  wordmarkColumn: {
    alignItems: 'center',
  },

  tagline: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
});
