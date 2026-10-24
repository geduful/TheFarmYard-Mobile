import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function RequestsScreen() {
  return (
    <Screen>
      <Text variant="title">Requests</Text>
      <Text tone="muted" style={{ marginTop: 6 }}>
        Buyer requests will appear here.
      </Text>
    </Screen>
  );
}