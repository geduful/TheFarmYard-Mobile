import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@/constants/tokens';
import { useDevRole } from '@/lib/dev-role';

/**
 * Six routes, five visible per role. The route name stays constant so a deep
 * link to `/` resolves correctly for both roles; only the label changes.
 *
 * Do not make the trigger list reactive. Changing it remounts the navigator and
 * discards navigation state — resolve the role before this layout mounts.
 */
export default function TabLayout() {
  const isFarmer = useDevRole() === 'farmer';

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.creamDark}
      labelStyle={{ selected: { color: colors.farmGreen } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{isFarmer ? 'Home' : 'Market'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md={isFarmer ? 'home' : 'storefront'} />
      </NativeTabs.Trigger>

      {isFarmer ? (
        <NativeTabs.Trigger name="listings">
          <NativeTabs.Trigger.Label>Listings</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="inventory_2" />
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="requests">
          <NativeTabs.Trigger.Label>Requests</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="assignment" />
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="receipt_long" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="scan">
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="qr_code_scanner" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
