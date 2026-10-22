import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function ScanScreen() {
  return (
    <Screen>
      <Text variant="title">Scan</Text>
      <Text tone="muted" style={{ marginTop: 4 }}>
        Camera opens in M7 to read traceability references.
      </Text>
    </Screen>
  );
}
