import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { colors, fonts } from '@/src/utils/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.navBg,
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        headerStyle: { backgroundColor: colors.navBg },
        headerTintColor: colors.navText,
        headerTitleStyle: { color: colors.navText, fontFamily: fonts.heading },
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold },
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Tabs',
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Bill History',
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
