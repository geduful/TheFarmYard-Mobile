import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fontSize } from '@/constants/tokens';

type Variant = 'hero' | 'title' | 'subtitle' | 'body' | 'caption';
type Tone = 'default' | 'muted' | 'inverse' | 'danger' | 'success';

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
};

export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  return (
    <RNText
      style={[styles.base, variantStyles[variant], toneStyles[tone], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  hero: { fontSize: fontSize.hero, fontWeight: '700', lineHeight: 34 },
  title: { fontSize: fontSize.title, fontWeight: '600', lineHeight: 26 },
  subtitle: { fontSize: fontSize.subtitle, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: fontSize.body, lineHeight: 20 },
  caption: { fontSize: fontSize.caption, lineHeight: 16 },
});

const variantStyles: Record<Variant, object> = {
  hero: styles.hero,
  title: styles.title,
  subtitle: styles.subtitle,
  body: styles.body,
  caption: styles.caption,
};

const toneStyles: Record<Tone, object> = {
  default: { color: colors.text },
  muted: { color: colors.muted },
  inverse: { color: colors.white },
  danger: { color: colors.alertRed },
  success: { color: colors.emerald },
};
