import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
} from 'react-native';

import { colors, fontSize } from '@/constants/tokens';

type Variant =
  | 'display'
  | 'hero'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption';

type Tone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'danger'
  | 'success';

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
};

export function Text({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[
        styles.base,
        variantStyles[variant],
        toneStyles[tone],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: fontSize.body,
    color: colors.text,
  },

  display: {
    fontSize: fontSize.display,
    lineHeight: 40,
    fontWeight: '700',
  },

  hero: {
    fontSize: fontSize.hero,
    lineHeight: 36,
    fontWeight: '700',
  },

  title: {
    fontSize: fontSize.title,
    lineHeight: 28,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: fontSize.subtitle,
    lineHeight: 22,
    fontWeight: '600',
  },

  body: {
    fontSize: fontSize.body,
    lineHeight: 21,
  },

  caption: {
    fontSize: fontSize.caption,
    lineHeight: 16,
  },
});

const variantStyles: Record<Variant, object> = {
  display: styles.display,
  hero: styles.hero,
  title: styles.title,
  subtitle: styles.subtitle,
  body: styles.body,
  caption: styles.caption,
};

const toneStyles: Record<Tone, object> = {
  default: { color: colors.text },
  secondary: { color: colors.textSecondary },
  muted: { color: colors.muted },
  inverse: { color: colors.white },
  danger: { color: colors.danger },
  success: { color: colors.emerald },
};