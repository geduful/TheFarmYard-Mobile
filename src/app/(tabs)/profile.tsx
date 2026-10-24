import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function ProfileScreen() {
  return (
    <Screen>
      <Text variant="title">Profile</Text>
      <Text tone="muted" style={{ marginTop: 6 }}>
        Your TheFarmYard profile and account settings.
      </Text>
    </Screen>
  );
}