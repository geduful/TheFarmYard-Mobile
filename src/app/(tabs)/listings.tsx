import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function ListingsScreen() {
  return (
    <Screen>
      <Text variant="title">My Listings</Text>
      <Text tone="muted" style={{ marginTop: 4 }}>
        Active and paused produce listings. Creation lands in M3.
      </Text>
    </Screen>
  );
}
