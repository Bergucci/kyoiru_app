import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

interface LegalLinksResponse {
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  commerceDisclosureUrl: string;
  supportUrl: string;
}

export default function LegalScreen() {
  const { session } = useSession();
  const [links, setLinks] = useState<LegalLinksResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<LegalLinksResponse>('/legal-links')
      .then((response) => {
        setLinks(response);
        setErrorText(null);
      })
      .catch((error) => {
        setErrorText(toApiErrorMessage(error));
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
        <Text style={styles.title}>法務リンク</Text>
        <Text style={styles.body}>
          審査導線に必要な公開ページは、現在の設定値を API から取得して表示しています。
        </Text>
      </View>

      {errorText ? (
        <View style={styles.card}>
          <Text style={styles.body}>{errorText}</Text>
        </View>
      ) : null}

      {links ? (
        <View style={styles.card}>
          {[
            ['プライバシーポリシー', links.privacyPolicyUrl],
            ['利用規約', links.termsOfServiceUrl],
            ['特定商取引法に基づく表記', links.commerceDisclosureUrl],
            ['サポート / お問い合わせ', links.supportUrl],
          ].map(([label, url]) => (
            <Pressable
              key={label}
              style={styles.linkRow}
              onPress={() => {
                void Linking.openURL(url);
              }}
            >
              <Text style={styles.linkLabel}>{label}</Text>
              <Text style={styles.linkUrl}>{url}</Text>
            </Pressable>
          ))}
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
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  linkRow: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f9f4eb',
    gap: 6,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  linkUrl: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
});
