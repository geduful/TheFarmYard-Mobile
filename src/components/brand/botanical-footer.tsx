import { StyleSheet, View } from 'react-native';

/**
 * Layered green hills with a young sprout, as used at the foot of the
 * password-recovery screens. Decoration only; never intercepts touches.
 */
export function BotanicalFooter() {
  return (
    <View style={styles.root} pointerEvents="none" accessible={false}>
      <View style={[styles.hill, styles.hillBack]} />
      <View style={[styles.hill, styles.hillMiddle]} />
      <View style={[styles.hill, styles.hillFront]} />
      <View style={[styles.hill, styles.hillDark]} />

      <View style={styles.sprout}>
        <View style={styles.stem} />

        <View style={[styles.leaf, styles.leafTop]} />
        <View style={[styles.leaf, styles.leafUpperLeft]} />
        <View style={[styles.leaf, styles.leafUpperRight]} />
        <View style={[styles.leaf, styles.leafLowerLeft]} />
        <View style={[styles.leaf, styles.leafLowerRight]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 190,
    marginTop: 'auto',
    overflow: 'hidden',
  },

  hill: {
    position: 'absolute',
    borderRadius: 999,
  },

  hillBack: {
    width: '135%',
    height: 150,
    left: '-18%',
    bottom: -78,
    backgroundColor: '#E4F0DE',
  },

  hillMiddle: {
    width: '118%',
    height: 132,
    left: '-14%',
    bottom: -72,
    backgroundColor: '#CFE5C6',
  },

  hillFront: {
    width: '96%',
    height: 118,
    right: '-18%',
    bottom: -62,
    backgroundColor: '#8CBB79',
  },

  hillDark: {
    width: '124%',
    height: 96,
    left: '-12%',
    bottom: -54,
    backgroundColor: '#1D5A2A',
  },

  sprout: {
    position: 'absolute',
    right: 58,
    bottom: 44,
    width: 120,
    height: 150,
  },

  stem: {
    position: 'absolute',
    left: 59,
    bottom: 0,
    width: 4,
    height: 126,
    borderRadius: 999,
    backgroundColor: '#1D5A2A',
  },

  leaf: {
    position: 'absolute',
    width: 48,
    height: 25,
    borderRadius: 999,
    backgroundColor: '#236B31',
  },

  leafTop: {
    left: 61,
    top: 2,
    width: 34,
    height: 46,
    transform: [{ rotate: '6deg' }],
  },

  leafUpperLeft: {
    left: 12,
    top: 26,
    transform: [{ rotate: '-22deg' }],
  },

  leafUpperRight: {
    left: 61,
    top: 44,
    transform: [{ rotate: '20deg' }],
  },

  leafLowerLeft: {
    left: 14,
    top: 72,
    transform: [{ rotate: '-16deg' }],
  },

  leafLowerRight: {
    left: 60,
    top: 90,
    transform: [{ rotate: '14deg' }],
  },
});
