import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors, fonts } from '@/src/utils/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.navBg,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          shadowColor: '#a08c64',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
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
          title: t('labels.myTabs'),
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('labels.billHistory'),
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('labels.profile'),
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
