import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TAB_BAR_CONTENT_HEIGHT = 60;

function TabIcon({
  focused,
  iconName,
}: {
  focused: boolean;
  iconName: IoniconName;
}) {
  return (
    <View
      style={[
        styles.iconMark,
        focused && styles.iconMarkActive,
      ]}
    >
      <Ionicons
        name={iconName}
        size={23}
        color={focused ? colors.farmGreen : colors.textSecondary}
      />
    </View>
  );
}

export default function FarmerTabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: colors.farmGreen,

        tabBarInactiveTintColor: colors.textSecondary,

        tabBarStyle: [
          styles.tabBar,
          {
            height:
              TAB_BAR_CONTENT_HEIGHT + insets.bottom,

            paddingBottom: insets.bottom,
          },
        ],

        tabBarLabelStyle: styles.tabLabel,

        tabBarIconStyle: styles.tabIconStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',

          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              iconName={focused ? 'home' : 'home-outline'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="listings"
        options={{
          title: 'Listings',

          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              iconName={focused ? 'bag' : 'bag-outline'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',

          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              iconName={focused ? 'clipboard' : 'clipboard-outline'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',

          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              iconName={focused ? 'person' : 'person-outline'}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: spacing.xs,

    paddingHorizontal: spacing.sm,

    backgroundColor: colors.surface,

    borderTopWidth: 1,

    borderTopColor: colors.border,
  },

  tabIconStyle: {
    marginTop: 2,
  },

  iconMark: {
    width: 44,

    height: 28,

    borderRadius: radius.pill,

    alignItems: 'center',

    justifyContent: 'center',
  },

  iconMarkActive: {
    backgroundColor: colors.mint,
  },

  tabLabel: {
    fontSize: 11,

    fontWeight: '600',

    marginTop: 2,
  },
});
