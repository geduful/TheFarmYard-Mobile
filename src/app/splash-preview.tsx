import { useEffect } from 'react';
import { Image, SafeAreaView, StyleSheet } from 'react-native';
import { router } from 'expo-router';

/*
 * TEMPORARY PREVIEW — DESIGN ONLY, NOT THE NATIVE LAUNCH SCREEN.
 *
 * This route previews the static splash screen configured in app.json
 * via the expo-splash-screen plugin:
 *
 *   backgroundColor: '#F7F9F5'
 *   image: './assets/branding/thefarmyard-logo.png'
 *   imageWidth: 200
 *   resizeMode: 'contain'
 *
 * Expo Go does not run the expo-splash-screen native plugin, so this
 * route previews the design (logo proportions, positioning, background)
 * on a physical device. It is NOT the actual operating-system launch
 * screen.
 *
 * After 2 seconds, automatically navigates into the app through the
 * root index route (/), which handles authentication (sign-in required,
 * role-based redirect to /(tabs) for buyers or /(farmer) for farmers).
 * Authentication is not bypassed.
 *
 * Remove this file after the design is approved.
 */

export default function SplashPreviewScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../../assets/branding/thefarmyard-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 200,
    height: 200,
  },
});
