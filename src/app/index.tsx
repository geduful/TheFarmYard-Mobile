import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/brand/brand-lockup';
import { Text } from '@/components/ui/text';
import { colors, radius, spacing } from '@/constants/tokens';
import { useResponsiveLayout } from '@/constants/responsive';
import { useAuth } from '@/providers/auth-provider';

const welcomePhoto = require('../../assets/images/welcome-farmland.jpg');
const welcomeScrim = require('../../assets/images/welcome-scrim.png');

export default function Index() {
  const { session, profile, role, loading, signOut } = useAuth();

  const layout = useResponsiveLayout();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <BrandLockup variant="stacked" size="md" />

        <ActivityIndicator
          size="small"
          color={colors.farmGreen}
          style={styles.spinner}
        />
      </View>
    );
  }

  if (session && role === 'buyer') {
    return <Redirect href="/(tabs)" />;
  }

  if (session && role === 'farmer') {
    return <Redirect href="/(farmer)" />;
  }

  if (session && role === 'admin') {
    return (
      <StateMessage
        title="Admin account"
        message="TheFarmYard admin access is not available in the mobile app yet. Please use the web administration dashboard."
        onSignOut={() => void signOut()}
      />
    );
  }

  if (session && !profile) {
    return (
      <StateMessage
        title="Profile unavailable"
        message="We signed you in, but your TheFarmYard profile could not be loaded."
        onSignOut={() => void signOut()}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ImageBackground
        source={welcomePhoto}
        style={styles.photo}
        resizeMode="cover"
      />

      <Image
        source={welcomeScrim}
        style={styles.scrim}
        resizeMode="stretch"
      />

      <SafeAreaView
        style={styles.safe}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: Math.max(
                layout.horizontalPadding,
                16
              ),
            },
          ]}
        >
          <View style={styles.brandRow}>
            <BrandLockup variant="stacked" size="lg" />
          </View>

          <View style={styles.copy}>
            <Text style={styles.headline}>
              Fresh Produce{'\n'}Direct from{'\n'}Farmers
            </Text>

            <Text style={styles.supporting}>
              Better food. Fairer prices.{'\n'}Stronger communities.
            </Text>
          </View>

          <View style={styles.actionPanel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get started"
              onPress={() => router.push('/(auth)/signup')}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="I already have an account"
              onPress={() => router.push('/(auth)/login')}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                I already have an account
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StateMessage({
  title,
  message,
  onSignOut,
}: {
  title: string;
  message: string;
  onSignOut: () => void;
}) {
  return (
    <SafeAreaView style={styles.stateSafe}>
      <View style={styles.stateContainer}>
        <View style={styles.stateBrand}>
          <BrandLockup variant="horizontal" size="md" />
        </View>

        <Text variant="title">{title}</Text>

        <Text tone="muted" style={styles.stateMessage}>
          {message}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={styles.stateButton}
        >
          <Text tone="inverse" style={styles.stateButtonText}>
            Sign out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.farmGreenDark,
  },

  photo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  safe: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  brandRow: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },

  copy: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    maxWidth: 360,
  },

  headline: {
    color: colors.white,
    fontSize: 40,
    lineHeight: 47,
    fontWeight: '800',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },

  supporting: {
    marginTop: spacing.md,
    color: 'rgba(255, 255, 255, 0.96)',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  actionPanel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl + 4,
    backgroundColor: '#F8F6F0',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },

  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.farmGreen,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.9,
  },

  secondaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.farmGreen,
    backgroundColor: 'transparent',
  },

  secondaryButtonPressed: {
    backgroundColor: colors.mint,
  },

  secondaryButtonText: {
    color: colors.farmGreen,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  spinner: {
    marginTop: spacing.lg,
  },

  stateSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  stateContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  stateBrand: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },

  stateMessage: {
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  stateButton: {
    minHeight: 50,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.farmGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateButtonText: {
    fontWeight: '700',
  },
});
