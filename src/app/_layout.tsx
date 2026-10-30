import { Stack } from 'expo-router';

import { DeepLinkHandler } from '@/components/auth/deep-link-handler';
import { AuthProvider } from '@/providers/auth-provider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <DeepLinkHandler />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AuthProvider>
  );
}