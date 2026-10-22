import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDevRole } from '@/lib/dev-role';

export default function ProfileScreen() {
  const isFarmer = useDevRole() === 'farmer';

  return (
    <Screen>
      <Text variant="title">Profile</Text>
      <Text tone="muted" style={{ marginTop: 4 }}>
        {isFarmer
          ? 'Verification tier, payout details and farm location.'
          : 'Contact details, verification and sign out.'}
      </Text>
    </Screen>
  );
}
