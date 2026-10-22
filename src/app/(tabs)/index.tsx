import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDevRole } from '@/lib/dev-role';

export default function HomeScreen() {
  const isFarmer = useDevRole() === 'farmer';

  return (
    <Screen>
      <Text variant="title">{isFarmer ? 'Dashboard' : 'Marketplace'}</Text>
      <Text tone="muted" style={{ marginTop: 4 }}>
        {isFarmer
          ? 'Active orders, payouts and verification status will live here.'
          : 'Browse and search listings here.'}
      </Text>
    </Screen>
  );
}
