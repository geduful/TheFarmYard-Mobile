import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function RequestsScreen() {
  return (
    <Screen>
      <Text variant="title">Requests</Text>
      <Text tone="muted" style={{ marginTop: 4 }}>
        Buy requests you have posted, and the offers farmers make on them.
      </Text>
    </Screen>
  );
}
