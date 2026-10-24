import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function MarketScreen() {
  return (
    <Screen>
      <Text variant="title">Market</Text>
      <Text tone="muted" style={{ marginTop: 6 }}>
        Browse all available farm produce.
      </Text>
    </Screen>
  );
}