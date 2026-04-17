import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

interface SubscriptionCopy {
  planName: string;
  priceDisplay: string;
  billingCycle: string;
  freeTrial: string;
  autoRenew: string;
  cancellationMethod: string;
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
  reviewSummary: string;
}

export default function SubscriptionInfoScreen() {
  const { session } = useSession();
  const [copy, setCopy] = useState<SubscriptionCopy | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<SubscriptionCopy>('/billing/subscription-copy')
      .then((response) => {
        setCopy(response);
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
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>見守りプランについて</Text>
        <Text style={styles.heroText}>{copy?.reviewSummary ?? '読込中...'}</Text>
      </View>

      {errorText ? (
        <View style={styles.card}>
          <Text style={styles.body}>{errorText}</Text>
        </View>
      ) : null}

      {copy ? (
        <>
          <View style={styles.card}>
            {[
              `プラン名: ${copy.planName}`,
              `価格: ${copy.priceDisplay}`,
              `周期: ${copy.billingCycle}`,
              `無料トライアル: ${copy.freeTrial}`,
              `更新方式: ${copy.autoRenew}`,
              `解約方法: ${copy.cancellationMethod}`,
            ].map((item) => (
              <Text key={item} style={styles.body}>
                {item}
              </Text>
            ))}
          </View>

          <View style={styles.card}>
            <Pressable
              style={styles.linkRow}
              onPress={() => {
                void Linking.openURL(copy.termsOfServiceUrl);
              }}
            >
              <Text style={styles.linkLabel}>利用規約を開く</Text>
            </Pressable>
            <Pressable
              style={styles.linkRow}
              onPress={() => {
                void Linking.openURL(copy.privacyPolicyUrl);
              }}
            >
              <Text style={styles.linkLabel}>プライバシーポリシーを開く</Text>
            </Pressable>
          </View>
        </>
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
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.sky,
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fcff',
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#d5e6ee',
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
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
