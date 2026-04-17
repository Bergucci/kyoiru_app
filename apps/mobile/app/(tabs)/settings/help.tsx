import { Redirect, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

interface LegalLinksResponse {
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  commerceDisclosureUrl: string;
  supportUrl: string;
}

export default function HelpScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [links, setLinks] = useState<LegalLinksResponse | null>(null);

  useEffect(() => {
    void apiRequest<LegalLinksResponse>('/legal-links')
      .then(setLinks)
      .catch((error) => {
        console.warn(toApiErrorMessage(error));
      });
  }, []);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>ヘルプ</Text>
        <Text style={styles.body}>
          Kyoiru の説明導線、法務リンク、退会導線はすべて設定配下から辿れます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>よく使う項目</Text>
        <Pressable
          style={styles.linkRow}
          onPress={() => {
            router.push('/(tabs)/settings/subscription-info' as never);
          }}
        >
          <Text style={styles.linkLabel}>見守りプラン説明</Text>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() => {
            router.push('/(tabs)/settings/location-permission' as never);
          }}
        >
          <Text style={styles.linkLabel}>位置情報の説明</Text>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() => {
            router.push('/(tabs)/settings/legal' as never);
          }}
        >
          <Text style={styles.linkLabel}>法務リンク</Text>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() => {
            router.push('/(tabs)/settings/account-delete' as never);
          }}
        >
          <Text style={styles.linkLabel}>アカウント削除</Text>
        </Pressable>
      </View>

      {links ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>サポート</Text>
          <Pressable
            style={styles.linkRow}
            onPress={() => {
              void Linking.openURL(links.supportUrl);
            }}
          >
            <Text style={styles.linkLabel}>サポート / お問い合わせを開く</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#f6f1e7',
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  linkRow: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f9f4eb',
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
});
