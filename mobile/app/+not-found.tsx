import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { colors, fonts } from '@/src/utils/theme';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('messages.oops') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('messages.screenNotFound')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('actions.goHome')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.heading,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: colors.link,
  },
});
