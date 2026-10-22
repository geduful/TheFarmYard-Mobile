import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function OrdersScreen() {
  return (
    <Screen>
      <Text variant="title">Orders</Text>
      <Text tone="muted" style={{ marginTop: 4 }}>
        Escrow state, delivery tokens and release confirmation.
      </Text>
    </Screen>
  );
}
