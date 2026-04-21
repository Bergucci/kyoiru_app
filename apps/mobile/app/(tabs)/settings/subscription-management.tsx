import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import { formatDateTime, toEntitlementLabel } from '../../../src/lib/format';
import { useEntitlement } from '../../../src/session/entitlement-context';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { PressableScale } from '../../../src/components';

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

export default function SubscriptionManagementScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { entitlement, loading: entitlementLoading } = useEntitlement();
  const [subscriptionCopy, setSubscriptionCopy] = useState<SubscriptionCopy | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken) {
      void loadSubscription();
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  async function loadSubscription() {
    try {
      setLoading(true);
      setLoadError(null);
      const copyResponse = await apiRequest<SubscriptionCopy>('/billing/subscription-copy');
      setSubscriptionCopy(copyResponse);
    } catch (error) {
      setLoadError(toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>サブスク管理</Text>
        <Text style={styles.body}>
          現在の権利状態と見守りプラン情報を設定タブ配下にまとめています。
        </Text>
      </View>

      {loading || (entitlementLoading && !entitlement) ? (
        <ActivityIndicator color={colors.accent} />
      ) : loadError ? (
        <View style={styles.card}>
          <Text style={styles.body}>{loadError}</Text>
          <PressableScale style={styles.secondaryButton} onPress={() => { void loadSubscription(); }}>
            <Text style={styles.secondaryButtonLabel}>再読み込み</Text>
          </PressableScale>
        </View>
      ) : !entitlement || !subscriptionCopy ? null : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>現在の契約</Text>
            <Text style={styles.body}>プラン: {entitlement.planName}</Text>
            <Text style={styles.body}>
              状態: {toEntitlementLabel(entitlement.status)}
            </Text>
            <Text style={styles.body}>
              有効期限: {formatDateTime(entitlement.currentPeriodExpiresAt)}
            </Text>
            {entitlement.gracePeriodExpiresAt ? (
              <Text style={styles.body}>
                Grace Period: {formatDateTime(entitlement.gracePeriodExpiresAt)}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>見守りプラン</Text>
            <Text style={styles.body}>{subscriptionCopy.reviewSummary}</Text>
            <Text style={styles.body}>{subscriptionCopy.priceDisplay}</Text>
            <Text style={styles.body}>{subscriptionCopy.billingCycle}</Text>
            <Text style={styles.body}>{subscriptionCopy.freeTrial}</Text>
            <Text style={styles.body}>{subscriptionCopy.autoRenew}</Text>
            <Text style={styles.body}>{subscriptionCopy.cancellationMethod}</Text>
            <PressableScale
              style={styles.secondaryButton}
              onPress={() => { router.push('/(tabs)/settings/terms' as never); }}
            >
              <Text style={styles.secondaryButtonLabel}>利用規約を開く</Text>
            </PressableScale>
            <PressableScale
              style={styles.secondaryButton}
              onPress={() => { router.push('/(tabs)/settings/privacy-policy' as never); }}
            >
              <Text style={styles.secondaryButtonLabel}>プライバシーポリシーを開く</Text>
            </PressableScale>
          </View>
        </>
      )}
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
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#ebe3d6',
  },
  secondaryButtonLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
});
